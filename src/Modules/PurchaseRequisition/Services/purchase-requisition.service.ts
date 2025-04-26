import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Between,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
  Repository,
} from "typeorm";
import { PurchaseRequisition } from "../Entities/purchase-requisition.entity";
import {
  PRApprovalActionType,
  PurchaseRequisitionStatus,
} from "../Enums/purchase-requisition.enum";
import {
  ICreatePurchaseRequisition,
  IGetAllPurchaseRequisitionInput,
  IPurchaseRequisition,
} from "../Types/purchase-requisition.types";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";
import { BudgetService } from "src/Modules/Budget/Services/budget.service";
import { PurchaseOrderService } from "src/Modules/PurchaseOrder/Services/purchase-order.service";
import { PurchaseOrderStatus } from "src/Modules/PurchaseOrder/Enums/purchase-order.enum";

@Injectable()
export class PurchaseRequisitionService {
  constructor(
    @InjectRepository(PurchaseRequisition)
    private readonly purchaseRequisitionRepository: Repository<PurchaseRequisition>,

    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly budgetService: BudgetService,
  ) {}

  public async checkForUnCompletedRequisition(
    userId: string,
    organisationId: string,
  ) {
    return await this.purchaseRequisitionRepository.findOne({
      where: {
        created_by: { id: userId },
        organisation: { id: organisationId },
        status: PurchaseRequisitionStatus.INITIALIZED,
      },
    });
  }

  public async initializePurchaseRequisition(
    userId: string,
    data: { organisationId: string; branchId: string; departmentId: string },
  ): Promise<{ id: string; pr_number: string }> {
    const requisition = this.purchaseRequisitionRepository.create({
      pr_number: await this.generatePrNumber(data.organisationId),
      organisation: { id: data.organisationId },
      created_by: { id: userId },
      branch: { id: data.branchId },
      department: { id: data.departmentId },
      status: PurchaseRequisitionStatus.INITIALIZED,
    });

    const insertResult = await this.purchaseRequisitionRepository
      .createQueryBuilder()
      .insert()
      .into(PurchaseRequisition)
      .values(requisition)
      .returning("*")
      .execute();

    const { id, pr_number } = insertResult.raw[0];
    return { id, pr_number };
  }

  public async finalizePurchaseRequisition(
    organisationId: string,
    userId: string,
    pr_number: string,
    data: ICreatePurchaseRequisition,
  ) {
    const { branch_id, department_id, supplier_id, ...request } = data;
    const requisition = await this.purchaseRequisitionRepository.findOne({
      where: {
        organisation: { id: organisationId },
        created_by: { id: userId },
        pr_number,
      },
    });

    if (!requisition) {
      throw new NotFoundException("Purchase Requisition not found");
    }

    if (
      new Set([
        PurchaseRequisitionStatus.APPROVED,
        PurchaseRequisitionStatus.REJECTED,
      ]).has(requisition.status)
    ) {
      throw new BadRequestException(
        `Purchase Requisition has already been ${requisition.status.toLowerCase()}`,
      );
    }

    // Update requisition status and other fields
    const updatedRequisition = await this.purchaseRequisitionRepository
      .createQueryBuilder()
      .update(PurchaseRequisition)
      .set({
        status: PurchaseRequisitionStatus.PENDING,
        branch: { id: branch_id },
        department: { id: department_id },
        supplier: { id: supplier_id },
        ...request,
      })
      .where("id = :id", { id: requisition.id })
      .returning("*")
      .execute();

    return updatedRequisition.raw[0];
  }

  public async createPurchaseRequisition(
    organisationId: string,
    data: IPurchaseRequisition,
  ): Promise<PurchaseRequisition> {
    return await this.purchaseRequisitionRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // 1️⃣ Create the requisition
        const requisition = this.purchaseRequisitionRepository.create({
          ...data,
          pr_number: await this.generatePrNumber(organisationId),
          organisation: { id: organisationId },
          // department: { name: data.department },
        });

        await transactionalEntityManager.save(requisition);

        return requisition;
      },
    );
  }

  public async getAllPurchaseRequisitions({
    organisationId,
    status,
    page,
    pageSize,
    startDate,
    endDate,
    exportAll = false,
  }: IGetAllPurchaseRequisitionInput): Promise<{
    requisitions: PurchaseRequisition[];
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
    } else {
      whereConditions.status = Not(
        In([
          PurchaseRequisitionStatus.SAVED_FOR_LATER,
          PurchaseRequisitionStatus.INITIALIZED,
        ]),
      );
    }

    // Build query options
    const queryOptions: any = {
      where: whereConditions,
      relations: ["created_by", "supplier", "items", "department", "branch"],
      select: {
        created_by: {
          first_name: true,
        },
        department: {
          id: true,
          name: true,
        },
        branch: {
          id: true,
          name: true,
        },
        supplier: {
          id: true,
          full_name: true,
        },
        items: {
          item_name: true,
          unit_price: true,
          currency: true,
          pr_quantity: true,
          po_quantity: true,
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

    const [requisitions, total] =
      await this.purchaseRequisitionRepository.findAndCount(queryOptions);

    return {
      requisitions,
      metadata: {
        total,
        page: _page,
        pageSize: _pageSize,
        totalPages: Math.ceil(total / _pageSize),
      },
    };
  }

  public async getPurchaseRequisitionById(
    organisationId: string,
    requisitionId: string,
  ): Promise<PurchaseRequisition | null> {
    return await this.purchaseRequisitionRepository.findOne({
      where: {
        organisation: { id: organisationId },
        id: requisitionId,
        status: Not(PurchaseRequisitionStatus.SAVED_FOR_LATER),
      },
      relations: ["created_by", "supplier", "items", "department", "branch"],
      select: {
        created_by: {
          first_name: true,
        },
        department: {
          id: true,
          name: true,
        },
        branch: {
          id: true,
          name: true,
        },
        supplier: {
          id: true,
          full_name: true,
        },
        items: {
          item_name: true,
          unit_price: true,
          currency: true,
          pr_quantity: true,
          po_quantity: true,
        },
      },
    });
  }

  public async updateApprovalDetails(
    requisitionId: string,
    organisationId: string,
    approvalData: {
      status: PurchaseRequisitionStatus;
      approved_by: any;
      approval_justification: string;
      budget_id: string;
      action_type: PRApprovalActionType;
      supplier_id?: string;
    },
  ): Promise<PurchaseRequisition> {
    const requisition = await this.purchaseRequisitionRepository.findOne({
      where: { id: requisitionId, organisation: { id: organisationId } },
      relations: ["created_by", "supplier"],
      select: {
        created_by: {
          id: true,
        },
        supplier: {
          id: true,
        },
      },
    });

    if (!requisition) {
      throw new NotFoundException("Purchase Requisition not found");
    }

    if (
      new Set([
        PurchaseRequisitionStatus.APPROVED,
        PurchaseRequisitionStatus.REJECTED,
      ]).has(requisition.status)
    ) {
      throw new BadRequestException(
        `Purchase Requisition has already been ${requisition.status.toLowerCase()}`,
      );
    }

    const supplierId = approvalData?.supplier_id || requisition.supplier?.id;

    if (!supplierId) {
      throw new BadRequestException(
        "No supplier is assigned to the requisition.",
      );
    }

    if (approvalData.status === PurchaseRequisitionStatus.APPROVED) {
      // Update budget reserved
      await this.budgetService.reserveAmount(
        organisationId,
        approvalData.budget_id,
        requisition.estimated_cost,
      );
    }

    const updatedRequisition = await this.purchaseRequisitionRepository
      .createQueryBuilder()
      .update(PurchaseRequisition)
      .set({
        status: approvalData.status,
        approved_by: approvalData.approved_by,
        approval_justification: approvalData.approval_justification,
        budget: { id: approvalData.budget_id },
        supplier: approvalData.supplier_id
          ? { id: approvalData.supplier_id }
          : undefined,
      })
      .where("id = :id", { id: requisition.id })
      .returning("*")
      .execute();

    if (
      approvalData.action_type === PRApprovalActionType.APPROVE_AND_CREATE_PO
    ) {
      // Create purchase order
      this.purchaseOrderService.create(organisationId, {
        request_id: requisitionId,
        total_amount: requisition.estimated_cost,
        supplier_id: approvalData?.supplier_id,
        created_by: { id: requisition.created_by.id },
        status: PurchaseOrderStatus.PENDING,
      });
    }

    return updatedRequisition.raw[0];
  }

  /**
   * @returns saved for later pr
   */
  public async getSavedPurchaseRequisitions(
    page: number = 1,
    pageSize: number = 10,
    userId: string,
    organisationId: string,
  ) {
    let _page = page;
    let _pageSize = pageSize;
    if (isNaN(page) || page < 1) _page = 1;
    if (isNaN(pageSize) || pageSize < 1) _pageSize = 10;

    const skip = (_page - 1) * _pageSize; // Calculate the offset

    // Fetch saved and initialized requisitions
    const requisitions = await this.getPurchaseRequisitions({
      where: {
        created_by: { id: userId },
        organisation: { id: organisationId },
        status: In([
          PurchaseRequisitionStatus.SAVED_FOR_LATER,
          PurchaseRequisitionStatus.INITIALIZED,
        ]),
      },
      relations: ["created_by", "supplier", "department", "branch"],
      select: {
        created_by: {
          first_name: true,
        },
        department: {
          id: true,
          name: true,
        },
        branch: {
          id: true,
          name: true,
        },
        supplier: {
          id: true,
          full_name: true,
        },
      },
      take: _pageSize,
      skip,
    });

    return requisitions;
  }

  public async getPurchaseRequisitions(
    query: any,
  ): Promise<PurchaseRequisition[]> {
    return await this.purchaseRequisitionRepository.find(query);
  }

  public async getPurchaseRequisition(
    query: any,
  ): Promise<PurchaseRequisition | null> {
    const pr = await this.purchaseRequisitionRepository.findOne(query);

    if (!pr) throw new NotFoundException("Purchase Requisition not found");

    return pr;
  }

  public async count(query: any) {
    return await this.purchaseRequisitionRepository.count(query);
  }

  private async generatePrNumber(organisationId: string) {
    const lastPr = await this.purchaseRequisitionRepository
      .createQueryBuilder("pr")
      .where("pr.organisation_id = :orgId", { orgId: organisationId })
      .orderBy("pr.created_at", "DESC")
      .getOne();

    let sequence = 1;
    if (lastPr) {
      const match = lastPr.pr_number.match(/^PR-(\d+)$/);
      sequence = match ? parseInt(match[1], 10) + 1 : 1;
    }

    return `PR-${String(sequence).padStart(3, "0")}`;
  }
}
