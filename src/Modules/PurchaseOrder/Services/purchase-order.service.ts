import {
  ForbiddenException,
  Inject,
  forwardRef,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from "typeorm";
import { PurchaseOrder } from "../Entities/purchase-order.entity";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import {
  IGetAllPurchaseOrdersInput,
  IPurchaseOrder,
} from "../Types/purchase-order.types";
import { SuppliersService } from "src/Modules/Supplier/Services/supplier.service";
import { PurchaseItem } from "src/Modules/PurchaseItem/Entities/purchase-item.entity";
import { PurchaseRequisitionService } from "src/Modules/PurchaseRequisition/Services/purchase-requisition.service";
import { PurchaseRequisitionStatus } from "src/Modules/PurchaseRequisition/Enums/purchase-requisition.enum";
import { PurchaseRequisition } from "src/Modules/PurchaseRequisition/Entities/purchase-requisition.entity";
import { BudgetService } from "src/Modules/Budget/Services/budget.service";
import { EmailServices } from "src/Modules/Mail/Services/mail.service";
import { PdfHelper } from "src/Shared/Helpers/pdf-generator.helper";
import { readFileSync } from "fs";
import { FileManagerService } from "src/Modules/FileManager/Services/upload.service";
import { HashHelper } from "src/Shared/Helpers/hash.helper";

@Injectable()
export class PurchaseOrderService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,

    @InjectRepository(PurchaseItem)
    private readonly purchaseItemRepository: Repository<PurchaseItem>,

    @Inject(forwardRef(() => PurchaseRequisitionService))
    private readonly purchaseRequisitionService: PurchaseRequisitionService,

    private readonly supplierService: SuppliersService,
    private readonly budgetService: BudgetService,
    private readonly emailService: EmailServices,
    private readonly pdfHelper: PdfHelper,
    private readonly fileManagerService: FileManagerService,
    private readonly hashHelper: HashHelper,
  ) {}

  public async create(
    organisationId: string,
    data: Partial<IPurchaseOrder>,
  ): Promise<Partial<PurchaseOrder>> {
    // check if PR is approved
    const pr = await this.purchaseRequisitionService.getPurchaseRequisition({
      where: { id: data.request_id },
      relations: ["items", "organisation"],
      select: {
        organisation: {
          id: true,
          name: true,
        },
      },
    });

    if (!pr) {
      throw new NotFoundException("Purchase Requisition not found");
    } else if (pr.status !== PurchaseRequisitionStatus.APPROVED) {
      throw new ForbiddenException("Purchase Requisition not approved");
    }

    const foundSupplier = await this.supplierService.findOne({
      where: { id: data.supplier_id },
    });

    if (!foundSupplier) throw new NotFoundException("Supplier not found");

    const po_number = await this.generatePoNumber(organisationId);

    const purchaseOrder = this.purchaseOrderRepository.create({
      ...data,
      po_number,
      purchase_requisition: { id: data.request_id } as PurchaseRequisition,
      organisation: { id: organisationId } as Organisation,
      supplier: foundSupplier,
    });

    const { supplier, ...savedPurchaseOrder } =
      await this.purchaseOrderRepository.save(purchaseOrder);

    const purchaseRequisitionId = pr.id;

    this.purchaseItemRepository
      .createQueryBuilder()
      .update(PurchaseItem)
      .set({ purchase_order: { id: savedPurchaseOrder.id } })
      .where("purchase_requisition_id = :purchaseRequisitionId", {
        purchaseRequisitionId,
      })
      .andWhere("purchase_order_id IS NULL") // Optional: Only update if not already linked
      .execute();

    this.genPdfAndSendEmail({
      supplierEmail: foundSupplier.email,
      organisationName: pr.organisation.name,
      poId: savedPurchaseOrder.po_number,
      items: pr.items,
      expectedDeliveryDate: pr.needed_by_date,
    });

    return savedPurchaseOrder;
  }

  /**
   * Pending orders will be approved requisitions that have not been converted to purchase orders
   */
  public async getAllPendingOrders() {}

  public async getOrganisationOrders({
    organisationId,
    status,
    page,
    pageSize,
    startDate,
    endDate,
    exportAll = false,
  }: IGetAllPurchaseOrdersInput): Promise<{
    orders: PurchaseOrder[];
    metadata: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
    let _page = page && page > 0 ? page : 1;
    let _pageSize = pageSize && pageSize > 0 ? pageSize : 10;

    const whereConditions: any = {
      organisation: { id: organisationId },
    };

    if (startDate && endDate) {
      whereConditions.created_at = Between(
        new Date(startDate),
        new Date(endDate),
      );
    } else if (startDate) {
      whereConditions.created_at = MoreThanOrEqual(new Date(startDate));
    } else if (endDate) {
      whereConditions.created_at = LessThanOrEqual(new Date(endDate));
    }

    // Handle status condition
    if (status) {
      whereConditions.status = status;
    }

    // Build query options
    const queryOptions: any = {
      where: whereConditions,
      relations: ["supplier", "purchase_requisition"],
      select: {
        supplier: {
          id: true,
          full_name: true,
          category: true,
        },
      },
    };

    // Enforce pagination for normal API calls, bypass when exporting
    if (!exportAll) {
      queryOptions.take = _pageSize;
      queryOptions.skip = (_page - 1) * _pageSize;
    }

    const [orders, total] =
      await this.purchaseOrderRepository.findAndCount(queryOptions);

    return {
      orders,
      metadata: {
        total,
        page: _page,
        pageSize: _pageSize,
        totalPages: Math.ceil(total / _pageSize),
      },
    };
  }

  public async getOrganisationOrderById(
    organisationId: string,
    orderId: string,
  ): Promise<PurchaseOrder> {
    const order = await this.purchaseOrderRepository.findOne({
      where: { organisation: { id: organisationId }, id: orderId },
      relations: ["supplier", "purchase_requisition"],
      select: {
        supplier: {
          id: true,
          full_name: true,
          category: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException("Purchase order not found");
    }
    return order;
  }

  public async updateOrderStatus(
    organisationId: string,
    orderId: string,
    status: string,
  ) {
    const order = await this.purchaseOrderRepository.findOne({
      where: { organisation: { id: organisationId }, id: orderId },
      relations: ["purchase_requisition.budget"],
    });

    if (!order) {
      throw new NotFoundException("Purchase order not found");
    }

    const budgetId = order.purchase_requisition.budget.id;
    await this.budgetService.consumeAmount(
      organisationId,
      budgetId,
      order.total_amount,
    );

    order.status = status;
    const { purchase_requisition, ...updatedOrder } =
      await this.purchaseOrderRepository.save(order);

    return updatedOrder;
  }

  public async count(query: any) {
    return this.purchaseOrderRepository.count(query);
  }

  private async generatePoNumber(organisationId: string): Promise<string> {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");

    const tenantCode = this.hashHelper.generateHashFromId(organisationId);

    const lastPo = await this.purchaseOrderRepository
      .createQueryBuilder("po")
      .where("po.po_number LIKE :pattern", {
        pattern: `PO-${tenantCode}-${yy}${mm}-%`,
      })
      .orderBy("po.created_at", "DESC")
      .limit(1)
      .getOne();

    let sequence = 1;
    if (lastPo) {
      const match = lastPo.po_number.match(/-(\d+)$/);
      sequence = match ? parseInt(match[1], 10) + 1 : 1;
    }

    return `PO-${tenantCode}-${yy}${mm}-${String(sequence).padStart(3, "0")}`;
  }

  private async purchaseOrderPdf(data: {
    supplierEmail: string;
    organisationName: string;
    poId: string;
    items: any[];
    expectedDeliveryDate: Date;
  }) {
    const filePath = `/tmp/po-${data.poId}.pdf`;
    await this.pdfHelper.generatePurchaseOrderPDF(
      data.organisationName,
      data.poId,
      data.items,
      data.expectedDeliveryDate,
      filePath,
    );

    // Upload PDF to AWS
    const fileBuffer = readFileSync(filePath);

    const file: Express.Multer.File = {
      fieldname: "file",
      originalname: `po-${data.poId}.pdf`,
      encoding: "7bit",
      mimetype: "application/pdf",
      size: fileBuffer.length,
      buffer: fileBuffer,
      destination: "",
      filename: "",
      path: "",
      stream: null as any,
    };

    const key = await this.fileManagerService.uploadFile(file);

    // Generate signed URL
    const signedUrl = await this.fileManagerService.getSignedUrl(key);

    return signedUrl;
  }

  private async genPdfAndSendEmail(data: {
    supplierEmail: string;
    organisationName: string;
    poId: string;
    items: any[];
    expectedDeliveryDate: Date;
  }): Promise<void> {
    const signedUrl = await this.purchaseOrderPdf(data);

    await this.emailService.sendPurchaseOrderEmail(data.supplierEmail, {
      organisationName: data.organisationName,
      poId: data.poId,
      expectedDeliveryDate: data.expectedDeliveryDate,
      signedUrl,
    });
  }
}
