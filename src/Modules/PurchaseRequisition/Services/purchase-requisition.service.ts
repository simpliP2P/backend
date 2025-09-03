import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PurchaseRequisition } from "../Entities/purchase-requisition.entity";
import { PurchaseRequisitionStatus } from "../Enums/purchase-requisition.enum";
import { ICreatePurchaseRequisition } from "../Types/purchase-requisition.types";
import { PurchaseRequisitionApprovalService } from "./purchase-requisition-approval.service";
import { PurchaseRequisitionWorkflowService } from "./purchase-requisition-workflow.service";
import { PurchaseRequisitionQueryService } from "./purchase-requisition-query.service";
import { OrganisationBranch } from "src/Modules/Organisation/Entities/organisation-branch.entity";
import { Supplier } from "src/Modules/Supplier/Entities/supplier.entity";
import { OrganisationDepartment } from "src/Modules/Organisation/Entities/organisation-department.entity";
import { User } from "src/Modules/User/Entities/user.entity";

@Injectable()
export class PurchaseRequisitionService {
  constructor(
    @InjectRepository(PurchaseRequisition)
    private readonly purchaseRequisitionRepository: Repository<PurchaseRequisition>,
    private readonly approvalService: PurchaseRequisitionApprovalService,
    private readonly workflowService: PurchaseRequisitionWorkflowService,
    private readonly queryService: PurchaseRequisitionQueryService,
  ) {}

  // Core CRUD Operations
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
    const unCompletedRequisition = await this.checkForUnCompletedRequisition(
      userId,
      data.organisationId,
    );

    if (unCompletedRequisition) {
      throw new BadRequestException(
        "Complete your pending requisition before creating a new one",
      );
    }

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
    const requisition = await this.findRequisitionForFinalization(
      organisationId,
      userId,
      pr_number,
    );

    this.validateFinalizationStatus(requisition);

    if (!branch_id || !department_id) {
      throw new BadRequestException(
        "Branch ID and Department ID are required for finalization",
      );
    }

    return await this.updateRequisitionToPending(
      requisition.id,
      branch_id,
      department_id,
      request,
    );
  }

  public async createPurchaseRequisition(
    organisationId: string,
    userId: string,
    data: Partial<ICreatePurchaseRequisition>,
  ): Promise<PurchaseRequisition> {
    return await this.purchaseRequisitionRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const requisition = this.purchaseRequisitionRepository.create({
          ...data,
          created_by: { id: userId } as User,
          department: { id: data.department_id } as OrganisationDepartment,
          supplier: { id: data.supplier_id } as Supplier,
          branch: { id: data.branch_id } as OrganisationBranch,
          status: PurchaseRequisitionStatus.SAVED_FOR_LATER,
          pr_number: await this.generatePrNumber(organisationId),
          organisation: { id: organisationId },
        });

        await transactionalEntityManager.save(requisition);
        return requisition;
      },
    );
  }

  public async updatePurchaseRequisition(
    organisationId: string,
    requisitionId: string,
    updateData: any,
  ): Promise<PurchaseRequisition> {
    const requisition = await this.findRequisitionForUpdate(
      requisitionId,
      organisationId,
    );
    this.validateUpdateStatus(requisition);

    Object.assign(requisition, updateData);
    return await this.purchaseRequisitionRepository.save(requisition);
  }

  // Delegated Operations
  public async updateApprovalDetails(
    requisitionId: string,
    organisationId: string,
    approvalData: any,
  ) {
    return await this.approvalService.updateApprovalDetails(
      requisitionId,
      organisationId,
      approvalData,
    );
  }

  public async submitForManagerReview(
    organisationId: string,
    requisitionId: string,
    managerReviewData: any,
  ) {
    return await this.workflowService.submitForManagerReview(
      organisationId,
      requisitionId,
      managerReviewData,
    );
  }

  // Query Operations Delegated
  public async getAllPurchaseRequisitions(params: any) {
    return await this.queryService.getAllPurchaseRequisitions(params);
  }

  public async getPurchaseRequisitionById(
    organisationId: string,
    requisitionId: string,
  ) {
    return await this.queryService.getPurchaseRequisitionById(
      organisationId,
      requisitionId,
    );
  }

  public async getSavedPurchaseRequisitions(
    page: number,
    pageSize: number,
    userId: string,
    organisationId: string,
  ) {
    return await this.queryService.getSavedPurchaseRequisitions(
      page,
      pageSize,
      userId,
      organisationId,
    );
  }

  public async findOrgPurchaseRequisitionsByIds(params: {
    organisationId: string;
    ids: string[];
  }) {
    return await this.queryService.findOrgPurchaseRequisitionsByIds(params);
  }

  public async getPurchaseRequisition(query: any) {
    return await this.queryService.getPurchaseRequisition(query);
  }

  public async count(query: any) {
    return await this.queryService.count(query);
  }

  // Private Helper Methods
  private async findRequisitionForFinalization(
    organisationId: string,
    userId: string,
    pr_number: string,
  ) {
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

    return requisition;
  }

  private validateFinalizationStatus(requisition: PurchaseRequisition): void {
    if (
      [
        PurchaseRequisitionStatus.APPROVED,
        PurchaseRequisitionStatus.REJECTED,
      ].includes(requisition.status)
    ) {
      throw new BadRequestException(
        `Purchase Requisition has already been ${requisition.status.toLowerCase()}`,
      );
    }
  }

  private async updateRequisitionToPending(
    requisitionId: string,
    branch_id: string,
    department_id: string,
    request: any,
  ): Promise<PurchaseRequisition> {
    const updatedRequisition = await this.purchaseRequisitionRepository
      .createQueryBuilder()
      .update(PurchaseRequisition)
      .set({
        status: PurchaseRequisitionStatus.PENDING,
        branch: { id: branch_id },
        department: { id: department_id },
        ...request,
      })
      .where("id = :id", { id: requisitionId })
      .returning("*")
      .execute();

    return updatedRequisition.raw[0];
  }

  private async findRequisitionForUpdate(
    requisitionId: string,
    organisationId: string,
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

    return requisition;
  }

  private validateUpdateStatus(requisition: PurchaseRequisition): void {
    if (
      [
        PurchaseRequisitionStatus.APPROVED,
        PurchaseRequisitionStatus.REJECTED,
      ].includes(requisition.status)
    ) {
      throw new BadRequestException(
        `Cannot update requisition that has been ${requisition.status.toLowerCase()}`,
      );
    }
  }

  private async generatePrNumber(organisationId: string): Promise<string> {
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
