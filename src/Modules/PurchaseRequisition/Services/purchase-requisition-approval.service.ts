import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PurchaseRequisition } from "../Entities/purchase-requisition.entity";
import {
  PRApprovalActionType,
  PurchaseRequisitionStatus,
} from "../Enums/purchase-requisition.enum";
import { BudgetService } from "src/Modules/Budget/Services/budget.service";
import { PurchaseOrderService } from "src/Modules/PurchaseOrder/Services/purchase-order.service";
import { PurchaseItem } from "src/Modules/PurchaseItem/Entities/purchase-item.entity";

interface IApprovalData {
  status: PurchaseRequisitionStatus;
  approved_by: any;
  approval_justification: string;
  budget_id?: string;
  action_type: PRApprovalActionType;
  supplier_id?: string;
}

@Injectable()
export class PurchaseRequisitionApprovalService {
  constructor(
    @InjectRepository(PurchaseRequisition)
    private readonly purchaseRequisitionRepository: Repository<PurchaseRequisition>,
    private readonly poService: PurchaseOrderService,
    private readonly budgetService: BudgetService,
  ) {}

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

    // create PO
    const isActionApproveAndCreatePO =
      approvalData.action_type === PRApprovalActionType.APPROVE_AND_CREATE_PO;
    if (isActionApproveAndCreatePO) {
      this.createPurchaseOrdersFromRequisition(organisationId, requisitionId);
    }

    return updatedRequisition;
  }

  private async createPurchaseOrdersFromRequisition(
    organisationId: string,
    requisitionId: string,
  ): Promise<void> {
    try {
      // Fetch requisition with items and suppliers
      const requisition = await this.purchaseRequisitionRepository.findOne({
        where: { id: requisitionId },
        relations: [
          "items",
          "items.supplier",
          "organisation",
          "branch",
          "department",
          "created_by",
        ],
      });

      if (!requisition) {
        throw new NotFoundException("Purchase requisition not found");
      }

      // Group items by supplier
      const itemsBySupplier = this.groupItemsBySupplier(requisition.items);

      // Create PO for each supplier
      for (const [supplierId, items] of Object.entries(itemsBySupplier)) {
        await this.poService.createMultipleSupplierPO(
          organisationId,
          {
            request_id: requisitionId,
            total_amount: items.reduce(
              (sum: number, item: PurchaseItem) =>
                sum + item.unit_price * (item.po_quantity || item.pr_quantity),
              0,
            ),
            supplier_id: supplierId,
            created_by: { id: requisition.created_by?.id },
            items: items.map((item) => item.id),
          },
          {
            id: requisitionId,
            status: PurchaseRequisitionStatus.APPROVED,
            organisation: {
              id: requisition.organisation?.id,
              name: requisition.organisation?.name,
            },
          },
        );
      }
    } catch (error) {
      throw error;
    }
  }

  private groupItemsBySupplier(items: any[]): Record<string, any[]> {
    return items.reduce((acc: Record<string, any[]>, item) => {
      if (item.supplier) {
        const supplierId = item.supplier.id;
        if (!acc[supplierId]) {
          acc[supplierId] = [];
        }
        acc[supplierId].push(item);
      }
      return acc;
    }, {});
  }

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
      !this.isPendingRequisitionBeingApproved(
        requisition.status,
        approvalData.status,
      )
    ) {
      throw new BadRequestException(
        "Only requisitions with 'PENDING' status can be approved.",
      );
    }

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
}
