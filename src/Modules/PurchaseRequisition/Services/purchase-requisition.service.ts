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
  public async checkForInitializedRequisition(
    userId: string,
    organisationId: string,
  ): Promise<boolean> {
    try {
      const result = await this.purchaseRequisitionRepository.manager.query(
        `SELECT 1 FROM purchase_requisitions 
         WHERE created_by = $1 
         AND organisation_id = $2 
         AND status = 'INITIALIZED'
         LIMIT 1`,
        [userId, organisationId],
      );

      return result.length > 0;
    } catch (error) {
      this.logger.error(
        `Error checking initialized requisition: ${error.message}`,
      );
      throw new BadRequestException("Failed to check requisition status");
    }
  }

  public async checkForUnCompletedRequisition(
    userId: string,
    organisationId: string,
  ): Promise<boolean> {
    try {
      // Ultra-fast raw SQL query - bypasses ORM overhead
      const result = await this.purchaseRequisitionRepository.manager.query(
        `SELECT 1 FROM purchase_requisitions 
         WHERE created_by = $1 
         AND organisation_id = $2 
         AND status = 'INITIALIZED'
         LIMIT 1`,
        [userId, organisationId],
      );

      return result.length > 0;
    } catch (error) {
      this.logger.error(
        `Error checking uncompleted requisition: ${error.message}`,
      );
      throw new BadRequestException("Failed to check requisition status");
    }
  }

  public async initializePurchaseRequisition(
    userId: string,
    data: { organisationId: string; branchId: string; departmentId: string },
  ): Promise<{ id: string; pr_number: string }> {
    const startTime = performance.now();

    try {
      // OPTIMIZATION: Single atomic query that checks AND generates PR number only when inserting
      // This eliminates 2 separate database round trips and prevents sequence gaps
      const result = await this.purchaseRequisitionRepository.manager.query(
        `WITH check_existing AS (
           SELECT 1 as has_existing 
           FROM purchase_requisitions 
           WHERE created_by = $1 
           AND organisation_id = $2 
           AND status = 'INITIALIZED'
           LIMIT 1
         ),
         ensure_seq AS (
           INSERT INTO pr_sequences (organisation_id, sequence_name)
           SELECT $2, 'pr_seq_' || replace($2::text, '-', '_')
           WHERE NOT EXISTS (SELECT 1 FROM pr_sequences WHERE organisation_id = $2)
         ),
         next_pr AS (
           SELECT nextval('pr_seq_' || replace($2::text, '-', '_')) as next_number
           WHERE NOT EXISTS (SELECT 1 FROM check_existing)
         ),
         insert_result AS (
           INSERT INTO purchase_requisitions 
           (pr_number, organisation_id, created_by, branch_id, department_id, status, created_at, updated_at) 
           SELECT 
             'PR-' || next_number::text,
             $2, $1, $3, $4, $5, NOW(), NOW()
           FROM next_pr
           RETURNING id, pr_number
         )
         SELECT 
           CASE 
             WHEN EXISTS (SELECT 1 FROM check_existing) THEN 'EXISTS'
             ELSE 'SUCCESS'
           END as status,
           (SELECT id FROM insert_result LIMIT 1) as id,
           (SELECT pr_number FROM insert_result LIMIT 1) as pr_number`,
        [
          userId,
          data.organisationId,
          data.branchId,
          data.departmentId,
          PurchaseRequisitionStatus.INITIALIZED,
        ],
      );

      const { status, id, pr_number } = result[0];

      if (status === "EXISTS") {
        throw new BadRequestException(
          "Complete your pending requisition before creating a new one",
        );
      }

      const duration = performance.now() - startTime;
      this.logger.log(
        `⚡ ULTRA-FAST PR INIT: ${pr_number} for user ${userId} in ${duration.toFixed(2)}ms`,
      );

      return { id, pr_number };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(
        `❌ PR init failed after ${duration.toFixed(2)}ms: ${error.message}`,
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
    userId: string,
  ) {
    return await this.queryService.getPurchaseRequisitionById(
      organisationId,
      requisitionId,
      userId,
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
          branch: branch_id ? { id: branch_id } : undefined,
          supplier: supplier_id ? { id: supplier_id } : undefined,
          department: department_id ? { id: department_id } : undefined,
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
    try {
      // Use transaction to prevent race conditions
      return await this.purchaseRequisitionRepository.manager.transaction(
        async (manager) => {
          // Ensure sequence exists for this organization
          this.ensureSequenceExists(manager, organisationId);

          // Get sequence name
          const sequenceName = `pr_seq_${organisationId.replace(/-/g, "_")}`;

          // Get next number from sequence (O(1) performance)
          const result = await manager.query(
            `SELECT nextval($1) as next_number`,
            [sequenceName],
          );

          const nextNumber = result[0]?.next_number || 1;
          return `PR-${nextNumber}`;
        },
      );
    } catch (error) {
      this.logger.error(`Error generating PR number: ${error.message}`);
      throw new BadRequestException("Failed to generate PR number");
    }
  }

  private async ensureSequenceExists(
    manager: any,
    organisationId: string,
  ): Promise<void> {
    try {
      const sequenceName = `pr_seq_${organisationId.replace(/-/g, "_")}`;

      // Check if sequence exists
      const sequenceExists = await manager.query(
        `SELECT 1 FROM pr_sequences WHERE organisation_id = $1`,
        [organisationId],
      );

      if (sequenceExists.length === 0) {
        // Create sequence for new organization
        await manager.query(`
          CREATE SEQUENCE IF NOT EXISTS ${sequenceName}
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1
        `);

        // Record in tracking table
        await manager.query(
          `
          INSERT INTO pr_sequences (organisation_id, sequence_name)
          VALUES ($1, $2)
          ON CONFLICT (organisation_id) DO NOTHING
        `,
          [organisationId, sequenceName],
        );

        this.logger.log(
          `Created PR sequence for organization ${organisationId}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error ensuring sequence exists: ${error.message}`);
      throw error;
    }
  }
}
