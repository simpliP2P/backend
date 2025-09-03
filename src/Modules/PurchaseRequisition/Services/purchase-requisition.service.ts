import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
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
  private readonly logger = new Logger(PurchaseRequisitionService.name);

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
  ): Promise<boolean> {
    // Ultra-fast raw SQL query - bypasses ORM overhead
    const result = await this.purchaseRequisitionRepository.manager.query(
      `SELECT 1 FROM purchase_requisitions 
       WHERE created_by = $1 
       AND organisation_id = $2 
       AND status NOT IN ('APPROVED', 'REJECTED') 
       LIMIT 1`,
      [userId, organisationId],
    );

    return result.length > 0;
  }

  public async initializePurchaseRequisition(
    userId: string,
    data: { organisationId: string; branchId: string; departmentId: string },
  ): Promise<{ id: string; pr_number: string }> {
    try {
      const [unCompletedRequisition, prNumber] = await Promise.all([
        this.checkForUnCompletedRequisition(userId, data.organisationId),
        this.generatePrNumber(data.organisationId),
      ]);

      if (unCompletedRequisition) {
        throw new BadRequestException(
          "Complete your pending requisition before creating a new one",
        );
      }

      // Ultra-fast raw SQL insert - bypasses ORM overhead
      const insertResult =
        await this.purchaseRequisitionRepository.manager.query(
          `INSERT INTO purchase_requisitions 
         (pr_number, organisation_id, created_by, branch_id, department_id, status, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
         RETURNING id, pr_number`,
          [
            prNumber,
            data.organisationId,
            userId,
            data.branchId,
            data.departmentId,
            PurchaseRequisitionStatus.INITIALIZED,
          ],
        );

      const { id, pr_number } = insertResult[0];

      return { id, pr_number };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Batch operation for creating multiple purchase requisitions
   * Much faster than creating them one by one
   */
  public async initializeMultiplePurchaseRequisitions(
    requests: Array<{
      userId: string;
      organisationId: string;
      branchId: string;
      departmentId: string;
    }>,
  ): Promise<Array<{ id: string; pr_number: string }>> {
    const startTime = performance.now();

    try {
      // Validate all in parallel
      const validationPromises = requests.map((req) =>
        this.checkForUnCompletedRequisition(req.userId, req.organisationId),
      );

      const validationResults = await Promise.all(validationPromises);

      if (validationResults.some((result) => result)) {
        throw new BadRequestException("Some users have pending requisitions");
      }

      // Generate all PR numbers in parallel
      const prNumbers = await Promise.all(
        requests.map((req) => this.generatePrNumber(req.organisationId)),
      );

      // Batch insert
      const values = requests.map((req, index) => ({
        pr_number: prNumbers[index],
        organisation: { id: req.organisationId },
        created_by: { id: req.userId },
        branch: { id: req.branchId },
        department: { id: req.departmentId },
        status: PurchaseRequisitionStatus.INITIALIZED,
      }));

      const insertResult = await this.purchaseRequisitionRepository
        .createQueryBuilder()
        .insert()
        .into(PurchaseRequisition)
        .values(values)
        .returning(["id", "pr_number"])
        .execute();

      const duration = performance.now() - startTime;
      this.logger.log(
        `✅ BATCH OPERATION: ${requests.length} PRs initialized in ${duration.toFixed(2)}ms (avg: ${(duration / requests.length).toFixed(2)}ms per PR)`,
      );

      return insertResult.raw;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(
        `❌ Batch PR initialization failed after ${duration.toFixed(2)}ms: ${error.message}`,
      );
      throw error;
    }
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
      supplier_id || "",
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
    supplier_id: string,
    department_id: string,
    request: any,
  ): Promise<PurchaseRequisition> {
    const updatedRequisition = await this.purchaseRequisitionRepository
      .createQueryBuilder()
      .update(PurchaseRequisition)
      .set({
        status: PurchaseRequisitionStatus.PENDING,
        branch: { id: branch_id },
        supplier: { id: supplier_id },
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
    // Ultra-fast raw SQL with optimized pattern matching
    const result = await this.purchaseRequisitionRepository.manager.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(pr_number, LENGTH('PR-${organisationId}-') + 1) AS INTEGER)), 0) + 1 as next_number
       FROM purchase_requisitions 
       WHERE organisation_id = $1 
       AND pr_number LIKE 'PR-${organisationId}-%'`,
      [organisationId],
    );

    const nextNumber = result[0]?.next_number || 1;
    return `PR-${nextNumber.toString().padStart(3, "0")}`;
  }
}
