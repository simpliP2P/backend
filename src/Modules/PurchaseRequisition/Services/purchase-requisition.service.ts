import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { PurchaseRequisition } from "../Entities/purchase-requisition.entity";
import { PurchaseRequisitionStatus } from "../Enums/purchase-requisition.enum";
import { PurchaseItemService } from "src/Modules/PurchaseItem/Services/purchase-item.service";
import { PurchaseItem } from "src/Modules/PurchaseItem/Entities/purchase-item.entity";

@Injectable()
export class PurchaseRequisitionService {
  constructor(
    @InjectRepository(PurchaseRequisition)
    private readonly purchaseRequisitionRepository: Repository<PurchaseRequisition>,

    private readonly purchaseItemService: PurchaseItemService,
  ) {}

  public async createPurchaseRequisition(
    organisationId: string,
    data: Partial<PurchaseRequisition>,
  ): Promise<PurchaseRequisition> {
    return await this.purchaseRequisitionRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // 1️⃣ Create the requisition
        const requisition = this.purchaseRequisitionRepository.create({
          ...data,
          organisation: { id: organisationId },
        });

        await transactionalEntityManager.save(requisition);

        // 2️⃣ Insert the purchase items in bulk
        const items = data.items;
        if ((items ?? []).length > 0) {
          const purchaseItems = (items ?? []).map((item) => ({
            ...item,
            purchase_requisition: requisition, // Assign saved requisition
          }));

          await transactionalEntityManager
            .createQueryBuilder()
            .insert()
            .into(PurchaseItem)
            .values(purchaseItems)
            .execute();
        }

        return requisition;
      },
    );
  }

  public async getAllPurchaseRequisitions(
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

    const requisitions = await this.getPurchaseRequisitions({
      where: {
        created_by: { id: userId },
        organisation: { id: organisationId },
        status: Not(PurchaseRequisitionStatus.SAVED_FOR_LATER),
      },
      take: _pageSize,
      skip,
      relations: ["created_by"],
      select: {
        created_by: {
          first_name: true,
          id: true,
        },
      },
    });

    return requisitions;
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
      relations: ["created_by"],
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

    const requisitions = await this.getPurchaseRequisitions({
      where: {
        created_by: { id: userId },
        organisation: { id: organisationId },
        status: PurchaseRequisitionStatus.SAVED_FOR_LATER,
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

  public async count(query: any) {
    return await this.purchaseRequisitionRepository.count(query);
  }

  /*
  private async generatePrNumber(tenantCode: string) {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2); // Get last two digits of the year (e.g., "25" for 2025)
    const mm = String(now.getMonth() + 1).padStart(2, "0"); // Month as 01, 02, ..., 12

    // Find the latest PR number for the tenant in the same month
    const lastPr = await PurchaseRequisition.findOne({
      where: {
        prNumber: `PR-${tenantCode}-${yy}${mm}-%`, // Pattern match
      },
      order: { created_at: "DESC" },
    });

    let sequence = 1;
    if (lastPr) {
      const lastSeq = lastPr.prNumber.split("-").pop(); // Extract last sequence number
      sequence = parseInt(lastSeq || "0", 10) + 1;
    }

    return `PR-${tenantCode}-${yy}${mm}-${String(sequence).padStart(3, "0")}`;
  }*/
}
