import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PurchaseRequisition } from "../Entities/purchaseRequisition.entity";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import { ApprovalStatus } from "../Enums/purchaseRequisition.enum";

@Injectable()
export class PurchaseRequisitionService {
  constructor(
    @InjectRepository(PurchaseRequisition)
    private readonly purchaseRequisitionRepository: Repository<PurchaseRequisition>,
    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation>,
  ) {}

  async createPurchaseRequisition(
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

  async updateApprovalDetails(
    requisitionId: string,
    approvalData: {
      approval_status: ApprovalStatus;
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

    requisition.approval_status = approvalData.approval_status;
    requisition.approved_by = approvalData.approved_by;
    requisition.approval_justification = approvalData.approval_justification;

    return this.purchaseRequisitionRepository.save(requisition);
  }

  async count(query: any) {
    return this.purchaseRequisitionRepository.count(query);
  }
}
