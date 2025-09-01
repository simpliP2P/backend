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
import { UpdatePurchaseRequisitionDto } from "../Dtos/purchase-requisition.dto";

interface ItemWithSupplier {
  id: string;
  item_name: string;
  unit_price: number;
  pr_quantity: number;
  supplier_id: string;
  supplier_name: string;
}

interface SupplierGroup {
  supplier_id: string;
  supplier_name: string;
  items: ItemWithSupplier[];
  total_amount: number;
}

interface IApprovalData {
  status: PurchaseRequisitionStatus;
  approved_by: any;
  approval_justification: string;
  budget_id?: string;
  action_type: PRApprovalActionType;
  supplier_id?: string;
}

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
    // Note: supplier is no longer assigned at PR level in the new workflow
    const updatedRequisition = await this.purchaseRequisitionRepository
      .createQueryBuilder()
      .update(PurchaseRequisition)
      .set({
        status: PurchaseRequisitionStatus.PENDING,
        branch: { id: branch_id },
        department: { id: department_id },
        ...request,
      })
      .where("id = :id", { id: requisition.id })
      .returning("*")
      .execute();

    return updatedRequisition.raw[0];
  }

  public async createPurchaseRequisition(
    organisationId: string,
    data: Partial<IPurchaseRequisition>,
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
          // unit_price: true,
          // currency: true,
          // pr_quantity: true,
          // po_quantity: true,
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
          address: true,
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
    approvalData: IApprovalData,
  ): Promise<PurchaseRequisition> {
    const requisition = await this.findRequisitionForApproval(
      requisitionId,
      organisationId,
    );

    await this.validateApprovalRequest(requisition, approvalData);

    if (this.shouldReserveBudget(approvalData)) {
      await this.reserveBudgetForApproval(
        organisationId,
        approvalData.budget_id!,
        requisition.estimated_cost,
      );
    }

    const updatedRequisition = await this.updateRequisitionStatus(
      requisitionId,
      approvalData,
    );

    if (this.shouldCreatePurchaseOrders(approvalData)) {
      await this.handlePurchaseOrderCreation(
        requisition,
        organisationId,
        requisitionId,
      );
    }

    return updatedRequisition;
  }

  public async updatePurchaseRequisition(
    organisationId: string,
    requisitionId: string,
    updateData: UpdatePurchaseRequisitionDto,
  ): Promise<PurchaseRequisition> {
    const requisition = await this.purchaseRequisitionRepository.findOne({
      where: {
        id: requisitionId,
        organisation: { id: organisationId },
      },
    });

    if (!requisition) {
      throw new NotFoundException("Purchase Requisition not found");
    }

    // Check if requisition can be updated (not in final states)
    if (
      new Set([
        PurchaseRequisitionStatus.APPROVED,
        PurchaseRequisitionStatus.REJECTED,
      ]).has(requisition.status)
    ) {
      throw new BadRequestException(
        `Cannot update requisition that has been ${requisition.status.toLowerCase()}`,
      );
    }

    // Update the requisition with new data and save to trigger @BeforeUpdate hook
    Object.assign(requisition, updateData);
    const updatedRequisition =
      await this.purchaseRequisitionRepository.save(requisition);

    return updatedRequisition;
  }

  public async submitForManagerReview(
    organisationId: string,
    requisitionId: string,
    managerReviewData: {
      item_supplier_assignments: Array<{
        item_id: string;
        supplier_id: string;
      }>;
      notes?: string;
    },
  ): Promise<PurchaseRequisition> {
    const requisition = await this.purchaseRequisitionRepository.findOne({
      where: {
        id: requisitionId,
        organisation: { id: organisationId },
      },
      relations: ["items"],
    });

    if (!requisition) {
      throw new NotFoundException("Purchase Requisition not found");
    }

    if (requisition.status !== PurchaseRequisitionStatus.PENDING) {
      throw new BadRequestException(
        `Cannot submit for manager review. Current status: ${requisition.status}`,
      );
    }

    // Validate that all items have suppliers assigned
    const itemIds = requisition.items.map((item) => item.id);
    const assignedItemIds = managerReviewData.item_supplier_assignments.map(
      (assignment) => assignment.item_id,
    );

    const missingItems = itemIds.filter((id) => !assignedItemIds.includes(id));
    if (missingItems.length > 0) {
      throw new BadRequestException(
        `All items must have suppliers assigned. Missing suppliers for items: ${missingItems.join(", ")}`,
      );
    }

    // Update requisition status to MANAGER_REVIEW
    const updatedRequisition = await this.purchaseRequisitionRepository
      .createQueryBuilder()
      .update(PurchaseRequisition)
      .set({
        status: PurchaseRequisitionStatus.MANAGER_REVIEW,
      })
      .where("id = :id", { id: requisition.id })
      .returning("*")
      .execute();

    // Update purchase items with supplier assignments
    for (const assignment of managerReviewData.item_supplier_assignments) {
      await this.purchaseRequisitionRepository.manager.query(
        `UPDATE purchase_items SET supplier_id = $1 WHERE id = $2 AND purchase_requisition_id = $3`,
        [assignment.supplier_id, assignment.item_id, requisitionId],
      );
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

  public async findOrgPurchaseRequisitionsByIds({
    organisationId,
    ids,
  }: {
    organisationId: string;
    ids: string[];
  }): Promise<PurchaseRequisition[]> {
    return await this.purchaseRequisitionRepository.find({
      where: {
        id: In(ids),
        organisation: { id: organisationId },
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
      order: {
        created_at: "DESC",
      },
    });
  }

  /* PRIVATE METHODS */

  private async findRequisitionForApproval(
    requisitionId: string,
    organisationId: string,
  ): Promise<PurchaseRequisition> {
    const requisition = await this.purchaseRequisitionRepository.findOne({
      where: { id: requisitionId, organisation: { id: organisationId } },
      relations: ["created_by", "supplier"],
      select: {
        created_by: { id: true },
        supplier: { id: true },
      },
    });

    if (!requisition) {
      throw new NotFoundException("Purchase Requisition not found");
    }

    return requisition;
  }

  private async validateApprovalRequest(
    requisition: PurchaseRequisition,
    approvalData: {
      status: PurchaseRequisitionStatus;
      action_type: PRApprovalActionType;
    },
  ): Promise<void> {
    if (this.isRequisitionInFinalState(requisition.status)) {
      throw new BadRequestException(
        `Purchase Requisition has already been ${requisition.status.toLowerCase()}`,
      );
    }

    if (
      this.isPendingRequisitionBeingApproved(
        requisition.status,
        approvalData.status,
      )
    ) {
      throw new BadRequestException(
        "Purchase Requisition must be reviewed by manager before approval. Current status: PENDING",
      );
    }

    // Validate supplier assignments for approval actions
    if (this.isApprovalAction(approvalData.action_type)) {
      await this.validateSupplierAssignments(requisition.id);
    }
  }

  private isRequisitionInFinalState(
    status: PurchaseRequisitionStatus,
  ): boolean {
    return [
      PurchaseRequisitionStatus.APPROVED,
      PurchaseRequisitionStatus.REJECTED,
    ].includes(status);
  }

  private isPendingRequisitionBeingApproved(
    currentStatus: PurchaseRequisitionStatus,
    requestedStatus: PurchaseRequisitionStatus,
  ): boolean {
    return (
      currentStatus === PurchaseRequisitionStatus.PENDING &&
      requestedStatus === PurchaseRequisitionStatus.APPROVED
    );
  }

  private isApprovalAction(actionType: PRApprovalActionType): boolean {
    return [
      PRApprovalActionType.APPROVE,
      PRApprovalActionType.APPROVE_AND_CREATE_PO,
    ].includes(actionType);
  }

  private async validateSupplierAssignments(
    requisitionId: string,
  ): Promise<void> {
    const itemsWithoutSuppliers =
      await this.purchaseRequisitionRepository.manager.query(
        `SELECT COUNT(*) as count FROM purchase_items 
       WHERE purchase_requisition_id = $1 AND supplier_id IS NULL`,
        [requisitionId],
      );

    if (itemsWithoutSuppliers[0].count > 0) {
      throw new BadRequestException(
        "Cannot approve requisition. All items must have suppliers assigned before approval.",
      );
    }
  }

  private shouldReserveBudget(approvalData: {
    status: PurchaseRequisitionStatus;
    budget_id?: string;
  }): boolean {
    return (
      approvalData.status === PurchaseRequisitionStatus.APPROVED &&
      !!approvalData.budget_id
    );
  }

  private async reserveBudgetForApproval(
    organisationId: string,
    budgetId: string,
    amount: number,
  ): Promise<void> {
    await this.budgetService.reserveAmount(organisationId, budgetId, amount);
  }

  private async updateRequisitionStatus(
    requisitionId: string,
    approvalData: {
      status: PurchaseRequisitionStatus;
      approved_by: any;
      approval_justification: string;
      budget_id?: string;
    },
  ): Promise<PurchaseRequisition> {
    const updatedRequisition = await this.purchaseRequisitionRepository
      .createQueryBuilder()
      .update(PurchaseRequisition)
      .set({
        status: approvalData.status,
        approved_by: approvalData.approved_by,
        approval_justification: approvalData.approval_justification,
        budget: { id: approvalData.budget_id },
      })
      .where("id = :id", { id: requisitionId })
      .returning("*")
      .execute();

    return updatedRequisition.raw[0];
  }

  private shouldCreatePurchaseOrders(approvalData: {
    action_type: PRApprovalActionType;
  }): boolean {
    return (
      approvalData.action_type === PRApprovalActionType.APPROVE_AND_CREATE_PO
    );
  }

  private async handlePurchaseOrderCreation(
    requisition: PurchaseRequisition,
    organisationId: string,
    requisitionId: string,
  ): Promise<void> {
    if (requisition.status === PurchaseRequisitionStatus.MANAGER_REVIEW) {
      await this.createMultipleSupplierPurchaseOrders(
        organisationId,
        requisitionId,
        requisition.created_by.id,
      );
    } else {
      await this.createLegacySinglePurchaseOrder(
        organisationId,
        requisitionId,
        requisition,
      );
    }
  }

  private async createMultipleSupplierPurchaseOrders(
    organisationId: string,
    requisitionId: string,
    createdById: string,
  ): Promise<void> {
    const supplierGroups = await this.getSupplierGroupsForItems(requisitionId);

    for (const supplierGroup of Object.values(supplierGroups)) {
      await this.createPurchaseOrderForSupplier(
        organisationId,
        requisitionId,
        createdById,
        supplierGroup,
      );
    }
  }

  private async getSupplierGroupsForItems(
    requisitionId: string,
  ): Promise<Record<string, SupplierGroup>> {
    const itemsWithSuppliers =
      await this.fetchItemsWithSupplierAssignments(requisitionId);
    return this.groupItemsBySupplier(itemsWithSuppliers);
  }

  private async fetchItemsWithSupplierAssignments(
    requisitionId: string,
  ): Promise<ItemWithSupplier[]> {
    const query = `
      SELECT 
        pi.id, 
        pi.item_name, 
        pi.unit_price, 
        pi.pr_quantity, 
        pi.supplier_id, 
        s.full_name as supplier_name
      FROM purchase_items pi
      LEFT JOIN suppliers s ON pi.supplier_id = s.id
      WHERE pi.purchase_requisition_id = $1 AND pi.supplier_id IS NOT NULL
    `;

    return await this.purchaseRequisitionRepository.manager.query(query, [
      requisitionId,
    ]);
  }

  private groupItemsBySupplier(
    itemsWithSuppliers: ItemWithSupplier[],
  ): Record<string, SupplierGroup> {
    return itemsWithSuppliers.reduce(
      (groups: Record<string, SupplierGroup>, item: ItemWithSupplier) => {
        const { supplier_id, supplier_name } = item;

        if (!groups[supplier_id]) {
          groups[supplier_id] = {
            supplier_id,
            supplier_name,
            items: [],
            total_amount: 0,
          };
        }

        groups[supplier_id].items.push(item);
        groups[supplier_id].total_amount += item.unit_price * item.pr_quantity;

        return groups;
      },
      {},
    );
  }

  private async createPurchaseOrderForSupplier(
    organisationId: string,
    requisitionId: string,
    createdById: string,
    supplierGroup: SupplierGroup,
  ): Promise<void> {
    await this.purchaseOrderService.createMultipleSupplierPO(organisationId, {
      request_id: requisitionId,
      total_amount: supplierGroup.total_amount,
      supplier_id: supplierGroup.supplier_id,
      created_by: { id: createdById },
      status: PurchaseOrderStatus.PENDING,
      items: supplierGroup.items.map((item) => item.id),
    });
  }

  private async createLegacySinglePurchaseOrder(
    organisationId: string,
    requisitionId: string,
    requisition: PurchaseRequisition,
  ): Promise<void> {
    await this.purchaseOrderService.create(organisationId, {
      request_id: requisitionId,
      total_amount: requisition.estimated_cost,
      supplier_id: requisition.supplier?.id,
      created_by: { id: requisition.created_by.id },
      status: PurchaseOrderStatus.PENDING,
    });
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
