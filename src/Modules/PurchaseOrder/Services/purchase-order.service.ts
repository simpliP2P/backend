import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
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
  private readonly logger = new Logger(PurchaseOrderService.name);

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
  public async createPOforSupplier(
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
        select: {
          id: true,
          full_name: true,
          email: true,
          phone: true,
          notification_channel: true,
        },
      });

      if (!data.created_by?.id) {
        throw new BadRequestException("Created by user ID is required");
      }

      // create purchase order
      const po_number = await this.generatePoNumber(organisationId);

      const { items, ...purchaseOrderData } = data;

      const purchaseOrder = this.purchaseOrderRepository.create({
        ...purchaseOrderData,
        po_number,
        purchase_requisition: { id: data.request_id } as PurchaseRequisition,
        organisation: { id: organisationId } as Organisation,
        supplier: foundSupplier,
        created_by: data.created_by,
      });

      const savedPurchaseOrder =
        await this.purchaseOrderRepository.save(purchaseOrder);

      // Update only the specified purchase items with this purchase order id
      await this.purchaseItemRepository
        .createQueryBuilder()
        .update(PurchaseItem)
        .set({ purchase_order: { id: savedPurchaseOrder.id } })
        .where("id IN (:...itemIds)", { itemIds: data.items })
        .andWhere("purchase_order_id IS NULL")
        .execute();

      if (!savedPurchaseOrder.created_by?.id) {
        throw new Error(
          "Created by user ID is missing after saving purchase order",
        );
      }

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
    // Check if the orderId matches PO number pattern (more reliable than UUID regex)
    const isPONumber = /^PO-?\d+$/i.test(orderId) || /^\d+$/.test(orderId);

    let order: PurchaseOrder | null;

    if (isPONumber) {
      // Handle PO number search - normalize the input
      const normalizedNumber = orderId.replace(/^PO-?/i, "");
      const patterns = [
        `PO-${normalizedNumber}`,
        `PO-${normalizedNumber.padStart(2, "0")}`,
        `PO-${normalizedNumber.padStart(3, "0")}`,
      ];

      // Use query builder for flexible PO number matching
      order = await this.purchaseOrderRepository
        .createQueryBuilder("po")
        .leftJoinAndSelect("po.supplier", "supplier")
        .leftJoinAndSelect("po.purchase_requisition", "purchase_requisition")
        .leftJoinAndSelect("purchase_requisition.branch", "branch")
        .leftJoinAndSelect("po.items", "items")
        .leftJoinAndSelect("po.organisation", "organisation")
        .select([
          "po",
          "supplier",
          "purchase_requisition",
          "branch",
          "items",
          "organisation.name",
          "organisation.logo",
        ])
        .where("po.organisation_id = :organisationId", { organisationId })
        .andWhere(
          "(po.po_number ILIKE :pattern1 OR po.po_number ILIKE :pattern2 OR po.po_number ILIKE :pattern3)",
          {
            pattern1: patterns[0],
            pattern2: patterns[1],
            pattern3: patterns[2],
          },
        )
        .getOne();
    } else {
      // Handle UUID search (fallback for anything that doesn't match PO pattern)
      order = await this.purchaseOrderRepository.findOne({
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
    }

    if (!order) {
      throw new NotFoundException("Purchase order not found");
    }
    return order;
  }

  public async approveOrRejectOrder(
    organisationId: string,
    orderId: string,
    status: string,
  ) {
    const order = await this.purchaseOrderRepository.findOne({
      where: { organisation: { id: organisationId }, id: orderId },
      relations: [
        "purchase_requisition.budget",
        "supplier",
        "organisation",
        "created_by",
      ],
      select: {
        supplier: {
          id: true,
          full_name: true,
          email: true,
          phone: true,
          notification_channel: true,
        },
        organisation: {
          id: true,
          name: true,
        },
        created_by: {
          id: true,
        },
      },
    });

    if (!order) {
      throw new NotFoundException("Purchase order not found");
    }

    if (!order.supplier) {
      throw new BadRequestException("Supplier details not found");
    }

    // update the product stock quantity
    if (status === PurchaseOrderStatus.APPROVED) {
      await this.consumeBudgetAndNotifySupplier({ order });
    }

    order.status = status;

    // Save updated order and exclude purchase_requisition from returned object
    const { purchase_requisition, ...updatedOrder } =
      await this.purchaseOrderRepository.save(order);

    return updatedOrder;
  }

  public async updateOrder(
    organisationId: string,
    orderId: string,
    data: {
      delivery_fee: number;
      vat_percent: number;
    },
  ) {
    const { delivery_fee, vat_percent } = data;

    const order = await this.purchaseOrderRepository.findOne({
      where: { organisation: { id: organisationId }, id: orderId },
    });

    if (!order) {
      throw new NotFoundException("Purchase order not found");
    }

    const totalAmount = Number(order.total_amount);
    order.vat = totalAmount * (vat_percent / 100) || 0;
    order.delivery_fee = delivery_fee || 0;

    order.total_amount =
      (totalAmount || 0) + (order.vat || 0) + (order.delivery_fee || 0);

    // Save updated order and exclude purchase_requisition from returned object
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

  private async consumeBudgetAndNotifySupplier(args: { order: PurchaseOrder }) {
    const { order } = args;
    const {
      id: poId,
      purchase_requisition,
      total_amount,
      supplier,
      organisation,
      created_by: { id: creatorId },
    } = order;

    const budgetId = purchase_requisition.budget?.id;
    const organisationId = organisation.id;

    if (!budgetId) {
      throw new BadRequestException(
        "Budget not attached to purchase requisition",
      );
    }

    this.budgetService.consumeReservedAmount(
      organisationId,
      budgetId,
      total_amount,
    );

    const poUrl = await this.genPurchaseOrderUrl({
      creatorId,
      organisationId,
      poId,
    });

    const notificationData: INotificationData = {
      organisationName: organisation.name,
      supplier: {
        name: supplier.full_name,
        email: supplier.email,
        phone: supplier.phone,
      },
      poUrl,
    };

    // notify supplier
    this.notifySupplier(supplier.notification_channel, notificationData);
  }

  private async generatePoNumber(organisationId: string): Promise<string> {
    try {
      const sequenceName = `po_seq_${organisationId.replace(/-/g, "_")}`;

      // Simple approach: create sequence if not exists, then get next value
      return await this.purchaseOrderRepository.manager.transaction(
        async (manager) => {
          // Create sequence and tracking record in one go
          await manager.query(`
            CREATE SEQUENCE IF NOT EXISTS ${sequenceName}
            START WITH 1
            INCREMENT BY 1
          `);

          await manager.query(
            `
            INSERT INTO po_sequences (organisation_id, sequence_name)
            VALUES ($1, $2)
            ON CONFLICT (organisation_id) DO NOTHING
          `,
            [organisationId, sequenceName],
          );

          // Get next number
          const result = await manager.query(
            `SELECT nextval($1) as next_number`,
            [sequenceName],
          );
          const nextNumber = result[0]?.next_number || 1;

          return `PO-${nextNumber}`;
        },
      );
    } catch (error) {
      this.logger.error(`Error generating PO number: ${error.message}`);
      throw new BadRequestException("Failed to generate PO number");
    }
  }

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
