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
import { PurchaseRequisitionStatus } from "../Enums/purchase-requisition.enum";
import { OrganisationService } from "src/Modules/Organisation/Services/organisation.service";
import {
  ICreatePurchaseRequisition,
  IPurchaseRequisition,
} from "../Types/purchase-requisition.types";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";

@Injectable()
export class PurchaseRequisitionService {
  constructor(
    @InjectRepository(PurchaseRequisition)
    private readonly purchaseRequisitionRepository: Repository<PurchaseRequisition>,
    private readonly organisationService: OrganisationService,
  ) {}

  public async checkForUnCompletedRequisition(userId: string) {
    return await this.purchaseRequisitionRepository.findOne({
      where: {
        created_by: { id: userId },
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
    const { branch_id, department_id, ...request } = data;
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

    if (requisition.status !== PurchaseRequisitionStatus.INITIALIZED) {
      throw new BadRequestException(
        "Purchase Requisition has already been finalized",
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

  public async getAllPurchaseRequisitions(
    page: number = 1,
    pageSize: number = 10,
    organisationId: string,
    status: PurchaseRequisitionStatus,
    startDate?: string,
    endDate?: string,
  ) {
    let _page = page;
    let _pageSize = pageSize;

    // Validate page and pageSize
    if (isNaN(page) || page < 1) _page = 1;
    if (isNaN(pageSize) || pageSize < 1) _pageSize = 10;

    const skip = (_page - 1) * _pageSize;

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

    const [requisitions, total] =
      await this.purchaseRequisitionRepository.findAndCount({
        where: whereConditions,
        take: _pageSize,
        skip,
        relations: ["created_by", "items", "department", "branch"],
        select: {
          created_by: {
            first_name: true,
            id: true,
          },
          department: {
            name: true,
          },
          branch: {
            name: true,
          },
          items: {
            item_name: true,
            unit_price: true,
            pr_quantity: true,
            po_quantity: true,
          }
        },
      });

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
      relations: ["created_by", "items"],
      select: {
        created_by: {
          first_name: true,
          id: true,
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
    },
  ): Promise<PurchaseRequisition> {
    const requisition = await this.purchaseRequisitionRepository.findOne({
      where: { id: requisitionId, organisation: { id: organisationId } },
    });

    if (!requisition) {
      throw new NotFoundException("Purchase Requisition not found");
    }

    requisition.status = approvalData.status;
    requisition.approved_by = approvalData.approved_by;
    requisition.approval_justification = approvalData.approval_justification;

    if (approvalData.status === PurchaseRequisitionStatus.APPROVED) {
    }

    return this.purchaseRequisitionRepository.save(requisition);
  }

  // returns: purchase requisition saved for later
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
    return await this.purchaseRequisitionRepository.findOne(query);
  }

  public async count(query: any) {
    return await this.purchaseRequisitionRepository.count(query);
  }

  private async generatePrNumber(organisationId: string) {
    const tenantCode =
      this.organisationService.generateHashFromId(organisationId);
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2); // Get last two digits of the year (e.g., "25" for 2025)
    const mm = String(now.getMonth() + 1).padStart(2, "0"); // Month as 01, 02, ..., 12

    const lastPr = await this.purchaseRequisitionRepository
      .createQueryBuilder("pr")
      .where("pr.pr_number LIKE :pattern", {
        pattern: `PR-${tenantCode}-${yy}${mm}-%`,
      })
      .orderBy("pr.created_at", "DESC")
      .getOne();

    let sequence = 1;
    if (lastPr) {
      const lastSeq = lastPr.pr_number.split("-").pop(); // Extract last sequence number
      sequence = parseInt(lastSeq || "0", 10) + 1;
    }

    return `PR-${tenantCode}-${yy}${mm}-${String(sequence).padStart(3, "0")}`;
  }
}
