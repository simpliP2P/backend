import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { PurchaseRequisition } from "../Entities/purchaseRequisition.entity";
import { PurchaseRequisitionStatus } from "../Enums/purchaseRequisition.enum";

@Injectable()
export class PurchaseRequisitionService {
  constructor(
    @InjectRepository(PurchaseRequisition)
    private readonly purchaseRequisitionRepository: Repository<PurchaseRequisition>,
  ) {}

  public async createPurchaseRequisition(
    organisationId: string,
    data: Partial<PurchaseRequisition>,
  ): Promise<PurchaseRequisition> {
    const newRequisition = this.purchaseRequisitionRepository.create({
      ...data,
      organisation: { id: organisationId },
    });

    return this.purchaseRequisitionRepository.save(newRequisition);
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
}
