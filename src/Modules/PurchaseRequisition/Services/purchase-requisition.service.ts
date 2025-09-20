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
import { PurchaseRequisitionQueryService } from "./purchase-requisition-query.service";
import { User } from "src/Modules/User/Entities/user.entity";
import { CreatePurchaseRequisitionDto } from "../Dtos/purchase-requisition.dto";

@Injectable()
export class PurchaseRequisitionService {
  private readonly logger = new Logger(PurchaseRequisitionService.name);

  constructor(
    @InjectRepository(PurchaseRequisition)
    private readonly purchaseRequisitionRepository: Repository<PurchaseRequisition>,
    private readonly approvalService: PurchaseRequisitionApprovalService,
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
      // Use a transaction to ensure atomicity
      return await this.purchaseRequisitionRepository.manager.transaction(
        async (manager) => {
          // Check for existing initialized requisition
          const existing = await manager.query(
            `SELECT 1 FROM purchase_requisitions 
             WHERE created_by = $1 AND organisation_id = $2 AND status = 'INITIALIZED'
             LIMIT 1`,
            [userId, data.organisationId],
          );

          if (existing.length > 0) {
            throw new BadRequestException(
              "Complete your pending requisition before creating a new one",
            );
          }

          // Ensure sequence exists for this organization
          await this.ensureSequenceExists(manager, data.organisationId);

          // Get next PR number
          const sequenceName = `pr_seq_${data.organisationId.replace(/-/g, "_")}`;
          const nextNumberResult = await manager.query(
            `SELECT nextval($1) as next_number`,
            [sequenceName],
          );
          const nextNumber = nextNumberResult[0].next_number;
          const prNumber = `PR-${nextNumber}`;

          // Insert the new requisition
          const insertResult = await manager.query(
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

          const duration = performance.now() - startTime;
          this.logger.log(
            `⚡ ULTRA-FAST PR INIT: ${prNumber} for user ${userId} in ${duration.toFixed(2)}ms`,
          );

          return {
            id: insertResult[0].id,
            pr_number: insertResult[0].pr_number,
          };
        },
      );
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
    data: CreatePurchaseRequisitionDto,
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
      organisationId,
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
        const { supplier_id, department_id, branch_id, ...rest } = data;
        const requisition = this.purchaseRequisitionRepository.create({
          ...rest,
          created_by: { id: userId } as User,
          department: department_id ? { id: department_id } : undefined,
          supplier: supplier_id ? { id: supplier_id } : undefined,
          branch: branch_id ? { id: branch_id } : undefined,
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
    organisationId: string,
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
      .andWhere("organisation_id = :orgId", { orgId: organisationId })
      .returning("*")
      .execute();

    // if supplier is sent, assign all items without supplier to this supplier
    if (supplier_id) {
      this.purchaseRequisitionRepository.manager.query(
        `
        UPDATE purchase_items
        SET supplier_id = $1
        WHERE purchase_requisition_id = $2
        AND (supplier_id IS NULL OR supplier_id = '')
      `,
        [supplier_id, requisitionId],
      );
    }

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
