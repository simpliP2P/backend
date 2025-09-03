import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Repository,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  In,
} from "typeorm";
import { PurchaseOrder } from "../Entities/purchase-order.entity";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import {
  IGetAllPurchaseOrdersInput,
  IPurchaseOrder,
} from "../Types/purchase-order.types";
import { SuppliersService } from "src/Modules/Supplier/Services/supplier.service";
import { PurchaseItem } from "src/Modules/PurchaseItem/Entities/purchase-item.entity";
import { PurchaseRequisitionStatus } from "src/Modules/PurchaseRequisition/Enums/purchase-requisition.enum";
import { PurchaseRequisition } from "src/Modules/PurchaseRequisition/Entities/purchase-requisition.entity";
import { BudgetService } from "src/Modules/Budget/Services/budget.service";
import { EmailServices } from "src/Modules/Mail/Services/mail.service";
import { PurchaseOrderStatus } from "../Enums/purchase-order.enum";
import { ClientHelper } from "src/Shared/Helpers/client.helper";
import { TokenService } from "src/Modules/Token/Services/token.service";
import { TokenType } from "src/Modules/Token/Enums/token.enum";
import { NotificationOrchestratorService } from "src/Modules/Notifications/Services/notification-orchestrator.service";
import { NotificationChannels } from "src/Modules/Supplier/Enums/supplier.enum";
import { INotificationData } from "src/Modules/Supplier/Types/supplier.types";

@Injectable()
export class PurchaseOrderService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseItem)
    private readonly purchaseItemRepository: Repository<PurchaseItem>,

    private readonly supplierService: SuppliersService,
    private readonly budgetService: BudgetService,
    private readonly emailService: EmailServices,
    private readonly clientHelper: ClientHelper,
    private readonly tokenService: TokenService,
    private readonly notificationOrchestrator: NotificationOrchestratorService,
  ) {}

  public async create(
    organisationId: string,
    data: Partial<IPurchaseOrder>,
    purchaseRequisition?: {
      id: string;
      status: PurchaseRequisitionStatus;
      organisation: { id: string; name: string };
    },
  ): Promise<Partial<PurchaseOrder>> {
    // check if PR is approved
    try {
      if (!purchaseRequisition) {
        throw new BadRequestException("Purchase requisition data is required");
      }

      if (purchaseRequisition.status !== PurchaseRequisitionStatus.APPROVED) {
        throw new ForbiddenException("Purchase Requisition not approved");
      }

      // get supplier details
      const foundSupplier = await this.supplierService.findOne({
        where: { id: data.supplier_id, organisation: { id: organisationId } },
      });

      // create purchase order
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

      const purchaseRequisitionId = purchaseRequisition.id;

      // Update purchase items with purchase order id
      this.purchaseItemRepository
        .createQueryBuilder()
        .update(PurchaseItem)
        .set({ purchase_order: { id: savedPurchaseOrder.id } })
        .where("purchase_requisition_id = :purchaseRequisitionId", {
          purchaseRequisitionId,
        })
        .andWhere("purchase_order_id IS NULL")
        .execute();

      // Generate purchase order Url for supplier to view
      const poUrl = await this.genPurchaseOrderUrl({
        creatorId: savedPurchaseOrder.created_by.id,
        organisationId,
        poId: savedPurchaseOrder.id,
      });

      const notificationData = {
        organisationName: purchaseRequisition.organisation.name,
        supplier: {
          name: foundSupplier.full_name,
          email: foundSupplier.email,
          phone: foundSupplier.phone,
        },
        poUrl,
      };

      this.notifySupplier(supplier.notification_channel, notificationData);

      return savedPurchaseOrder;
    } catch (error) {
      throw new Error(`Failed to create purchase order: ${error.message}`);
    }
  }

  /**
   * Creates a purchase order for a specific supplier with selected items
   * Used in the new workflow where items are assigned to different suppliers
   */
  public async createMultipleSupplierPO(
    organisationId: string,
    data: Partial<IPurchaseOrder> & { items: string[] },
    purchaseRequisition?: {
      id: string;
      status: PurchaseRequisitionStatus;
      organisation: { id: string; name: string };
    },
  ): Promise<Partial<PurchaseOrder>> {
    try {
      if (!purchaseRequisition) {
        throw new BadRequestException("Purchase requisition data is required");
      }

      if (purchaseRequisition.status !== PurchaseRequisitionStatus.APPROVED) {
        throw new ForbiddenException("Purchase Requisition not approved");
      }

      // get supplier details
      const foundSupplier = await this.supplierService.findOne({
        where: { id: data.supplier_id, organisation: { id: organisationId } },
      });

      // create purchase order
      const po_number = await this.generatePoNumber(organisationId);

      const { items, ...purchaseOrderData } = data;
      const purchaseOrder = this.purchaseOrderRepository.create({
        ...purchaseOrderData,
        po_number,
        purchase_requisition: { id: data.request_id } as PurchaseRequisition,
        organisation: { id: organisationId } as Organisation,
        supplier: foundSupplier,
      });

      const savedPurchaseOrder =
        await this.purchaseOrderRepository.save(purchaseOrder);
      const { supplier } = savedPurchaseOrder;

      // Update only the specified purchase items with this purchase order id
      await this.purchaseItemRepository
        .createQueryBuilder()
        .update(PurchaseItem)
        .set({ purchase_order: { id: savedPurchaseOrder.id } })
        .where("id IN (:...itemIds)", { itemIds: data.items })
        .andWhere("purchase_order_id IS NULL")
        .execute();

      // Generate purchase order Url for supplier to view
      const poUrl = await this.genPurchaseOrderUrl({
        creatorId: savedPurchaseOrder.created_by.id,
        organisationId,
        poId: savedPurchaseOrder.id,
      });

      const notificationData = {
        organisationName: purchaseRequisition.organisation.name,
        supplier: {
          name: foundSupplier.full_name,
          email: foundSupplier.email,
          phone: foundSupplier.phone,
        },
        poUrl,
      };

      this.notifySupplier(supplier.notification_channel, notificationData);

      return savedPurchaseOrder;
    } catch (error) {
      throw new Error(
        `Failed to create multiple supplier purchase order: ${error.message}`,
      );
    }
  }

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
      order: {
        created_at: "DESC",
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
      relations: [
        "supplier",
        "purchase_requisition",
        "purchase_requisition.branch",
        "items",
        "organisation",
      ],
      select: {
        organisation: {
          name: true,
          logo: true,
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

    // update the product stock quantity
    if (status === PurchaseOrderStatus.APPROVED) {
      const budgetId = order.purchase_requisition.budget.id;
      await this.budgetService.consumeReservedAmount(
        organisationId,
        budgetId,
        order.total_amount,
      );
    }

    order.status = status;
    const { purchase_requisition, ...updatedOrder } =
      await this.purchaseOrderRepository.save(order);

    return updatedOrder;
  }

  public async count(query: any) {
    return this.purchaseOrderRepository.count(query);
  }

  public async findOrgPurchaseOrdersByIds({
    organisationId,
    ids,
  }: {
    organisationId: string;
    ids: string[];
  }): Promise<PurchaseOrder[]> {
    return await this.purchaseOrderRepository.find({
      where: {
        id: In(ids),
        organisation: { id: organisationId },
      },
      relations: ["supplier", "purchase_requisition"],
      select: {
        supplier: {
          id: true,
          full_name: true,
        },
      },
      order: {
        created_at: "DESC",
      },
    });
  }

  private async generatePoNumber(organisationId: string) {
    const lastPo = await this.purchaseOrderRepository
      .createQueryBuilder("po")
      .where("po.organisation_id = :orgId", { orgId: organisationId })
      .orderBy("po.created_at", "DESC")
      .limit(1)
      .getOne();

    let sequence = 1;
    if (lastPo) {
      const match = lastPo.po_number.match(/^PO-(\d+)$/);
      sequence = match ? parseInt(match[1], 10) + 1 : 1;
    }

    return `PO-${String(sequence).padStart(3, "0")}`;
  }

  /**
   * Generates a link for the supplier to view the purchase order
   * @param data
   */
  private async genPurchaseOrderUrl(data: {
    creatorId: string;
    organisationId: string;
    poId: string;
  }): Promise<string> {
    const currentClientHost = this.clientHelper.getCurrentClient().landingPage;

    const validFor = 30 * 24 * 60; // 30 days in minutes

    // generate resource token
    const token = await this.tokenService.createToken(
      data.creatorId, // use creatorId as userId
      TokenType.RESOURCE_TOKEN,
      validFor,
      { organisationId: data.organisationId, poId: data.poId },
    );

    return `${currentClientHost}/purchase-orders/${data.poId}?x-resource-token=${token}`;
  }

  private async notifySupplier(
    channel: NotificationChannels,
    data: INotificationData,
  ) {
    const { organisationName, supplier, poUrl } = data;
    const supplierName = supplier.name;

    switch (channel) {
      case NotificationChannels.Email:
        await this.emailService.sendPurchaseOrderEmail(supplier.email, {
          organisationName,
          supplierName,
          signedUrl: poUrl,
        });
        break;

      case NotificationChannels.SMS:
        await this.notificationOrchestrator.sendPurchaseOrderNotification(
          NotificationChannels.SMS,
          supplier.phone,
          {
            organisationName,
            supplierName,
            poUrl,
          },
        );
        break;

      case NotificationChannels.WhatsApp:
        await this.notificationOrchestrator.sendPurchaseOrderNotification(
          NotificationChannels.WhatsApp,
          supplier.phone,
          {
            organisationName,
            supplierName,
            poUrl,
          },
        );
        break;

      default:
        throw new BadRequestException("Invalid notification channel");
    }
  }
}
