import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from "typeorm";
import { PurchaseOrder } from "../Entities/purchase-order.entity";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import { OrganisationService } from "src/Modules/Organisation/Services/organisation.service";
import {
  IGetAllPurchaseOrdersInput,
  IPurchaseOrder,
} from "../Types/purchase-order.types";
import { SuppliersService } from "src/Modules/Supplier/Services/supplier.service";
import { PurchaseItem } from "src/Modules/PurchaseItem/Entities/purchase-item.entity";
import { PurchaseRequisitionService } from "src/Modules/PurchaseRequisition/Services/purchase-requisition.service";
import { PurchaseRequisitionStatus } from "src/Modules/PurchaseRequisition/Enums/purchase-requisition.enum";
import { PurchaseRequisition } from "src/Modules/PurchaseRequisition/Entities/purchase-requisition.entity";

@Injectable()
export class PurchaseOrderService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,

    @InjectRepository(PurchaseItem)
    private readonly purchaseItemRepository: Repository<PurchaseItem>,

    private readonly supplierService: SuppliersService,
    private readonly organisationService: OrganisationService,
    private readonly purchaseRequisitionService: PurchaseRequisitionService,
  ) {}

  public async create(
    organisationId: string,
    data: Partial<IPurchaseOrder>,
  ): Promise<Partial<PurchaseOrder>> {
    // check if PR is approved
    const pr = await this.purchaseRequisitionService.getPurchaseRequisition({
      where: { id: data.request_id },
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
          full_name: true,
          category: {
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

  public async count(query: any) {
    return this.purchaseOrderRepository.count(query);
  }

  private async generatePoNumber(organisationId: string): Promise<string> {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");

    const tenantCode =
      this.organisationService.generateHashFromId(organisationId);

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
}
