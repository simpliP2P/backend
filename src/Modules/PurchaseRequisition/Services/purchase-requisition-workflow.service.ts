import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PurchaseRequisition } from "../Entities/purchase-requisition.entity";
import { PurchaseRequisitionStatus } from "../Enums/purchase-requisition.enum";

@Injectable()
export class PurchaseRequisitionWorkflowService {
  constructor(
    @InjectRepository(PurchaseRequisition)
    private readonly purchaseRequisitionRepository: Repository<PurchaseRequisition>,
  ) {}

  public async submitForManagerReview(
    organisationId: string,
    requisitionId: string,
    managerReviewData: {
      item_supplier_assignments: Array<{
        item_id: string;
        supplier_id: string;
      }>;
    },
  ): Promise<PurchaseRequisition> {
    const requisition = await this.findRequisitionForManagerReview(
      requisitionId,
      organisationId,
    );

    this.validateManagerReviewSubmission(requisition, managerReviewData);

    const updatedRequisition =
      await this.updateRequisitionStatusToManagerReview(requisitionId);

    await this.assignSuppliersToItems(
      requisitionId,
      managerReviewData.item_supplier_assignments,
    );

    return updatedRequisition;
  }

  private async findRequisitionForManagerReview(
    requisitionId: string,
    organisationId: string,
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

    return requisition;
  }

  private validateManagerReviewSubmission(
    requisition: PurchaseRequisition,
    managerReviewData: {
      item_supplier_assignments: Array<{
        item_id: string;
        supplier_id: string;
      }>;
    },
  ): void {
    if (requisition.status !== PurchaseRequisitionStatus.PENDING) {
      throw new BadRequestException(
        `Cannot submit for manager review. Current status: ${requisition.status}`,
      );
    }

    this.validateAllItemsHaveSuppliers(
      requisition.items.map((item) => item.id),
      managerReviewData.item_supplier_assignments.map(
        (assignment) => assignment.item_id,
      ),
    );
  }

  private validateAllItemsHaveSuppliers(
    itemIds: string[],
    assignedItemIds: string[],
  ): void {
    const missingItems = itemIds.filter((id) => !assignedItemIds.includes(id));

    if (missingItems.length > 0) {
      throw new BadRequestException(
        `All items must have suppliers assigned. Missing suppliers for items: ${missingItems.join(", ")}`,
      );
    }
  }

  private async updateRequisitionStatusToManagerReview(
    requisitionId: string,
  ): Promise<PurchaseRequisition> {
    const updatedRequisition = await this.purchaseRequisitionRepository
      .createQueryBuilder()
      .update(PurchaseRequisition)
      .set({
        status: PurchaseRequisitionStatus.MANAGER_REVIEW,
      })
      .where("id = :id", { id: requisitionId })
      .returning("*")
      .execute();

    return updatedRequisition.raw[0];
  }

  private async assignSuppliersToItems(
    requisitionId: string,
    itemSupplierAssignments: Array<{ item_id: string; supplier_id: string }>,
  ): Promise<void> {
    for (const assignment of itemSupplierAssignments) {
      await this.purchaseRequisitionRepository.manager.query(
        `UPDATE purchase_items SET supplier_id = $1 WHERE id = $2 AND purchase_requisition_id = $3`,
        [assignment.supplier_id, assignment.item_id, requisitionId],
      );
    }
  }
}
