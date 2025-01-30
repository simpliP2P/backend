import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PurchaseRequisition } from "../Entities/purchaseRequisition.entity";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import { PurchaseRequisitionStatus } from "../Enums/purchaseRequisition.enum";

@Injectable()
export class PurchaseRequisitionService {
  constructor(
    @InjectRepository(PurchaseRequisition)
    private readonly purchaseRequisitionRepository: Repository<PurchaseRequisition>,
    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation>,
  ) {}

  public async createPurchaseRequisition(
    organisationId: string,
    data: Partial<PurchaseRequisition>,
  ): Promise<PurchaseRequisition> {
    const organisation = await this.organisationRepository.findOne({
      where: { id: organisationId },
    });

    if (!organisation) {
      throw new NotFoundException("Organisation not found");
    }

    const newRequisition = this.purchaseRequisitionRepository.create({
      ...data,
      organisation,
    });

    return this.purchaseRequisitionRepository.save(newRequisition);
  }

  public async updateApprovalDetails(
    requisitionId: string,
    approvalData: {
      status: PurchaseRequisitionStatus;
      approved_by: any;
      approval_justification: string;
    },
  ): Promise<PurchaseRequisition> {
    const requisition = await this.purchaseRequisitionRepository.findOne({
      where: { id: requisitionId },
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
    userId: string,
    organisationId: string,
  ) {
    return await this.getPurchaseRequisitions({
      where: {
        created_by: userId,
        organisation_id: organisationId,
        status: PurchaseRequisitionStatus.SAVED_FOR_LATER,
      },
    });
  }

  public async getPurchaseRequisitions(
    query: any,
  ): Promise<PurchaseRequisition[]> {
    return await this.purchaseRequisitionRepository.find(query);
  }

  public async count(query: any) {
    return await this.purchaseRequisitionRepository.count(query);
  }
}
