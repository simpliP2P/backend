import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Repository,
  Between,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
} from "typeorm";
import { PurchaseRequisition } from "../Entities/purchase-requisition.entity";
import { PurchaseRequisitionStatus } from "../Enums/purchase-requisition.enum";
import { IGetAllPurchaseRequisitionInput } from "../Types/purchase-requisition.types";

@Injectable()
export class PurchaseRequisitionQueryService {
  constructor(
    @InjectRepository(PurchaseRequisition)
    private readonly purchaseRequisitionRepository: Repository<PurchaseRequisition>,
  ) {}

  public async getAllPurchaseRequisitions({
    userId,
    organisationId,
    status,
    page,
    pageSize,
    startDate,
    endDate,
    exportAll = false,
  }: IGetAllPurchaseRequisitionInput): Promise<{
    requisitions: PurchaseRequisition[];
    metadata: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
    const { _page, _pageSize } = this.normalizePagination(
      page || 1,
      pageSize || 20,
    );
    const whereConditions = this.buildWhereConditions(
      userId,
      organisationId,
      startDate,
      endDate,
      status,
    );
    const queryOptions = this.buildQueryOptions(
      whereConditions,
      _page,
      _pageSize,
      exportAll,
    );

    const [requisitions, total] =
      await this.purchaseRequisitionRepository.findAndCount(queryOptions);

    return {
      requisitions,
      metadata: this.buildMetadata(total, _page, _pageSize),
    };
  }

  public async getPurchaseRequisitionById(
    organisationId: string,
    requisitionId: string,
    userId: string,
  ): Promise<PurchaseRequisition | null> {
    const pr = await this.purchaseRequisitionRepository.findOne({
      where: {
        organisation: { id: organisationId },
        id: requisitionId,
      },
      relations: ["created_by", "supplier", "items", "department", "branch"],
      select: this.getDetailedSelectFields(),
    });

    if (!pr) throw new NotFoundException("Purchase Requisition not found");

    const isSavedForLaterByUser =
      pr.created_by?.id === userId &&
      pr.status === PurchaseRequisitionStatus.SAVED_FOR_LATER;

    if (isSavedForLaterByUser) {
      throw new NotFoundException("Purchase Requisition not found");
    }

    return pr;
  }

  public async getSavedPurchaseRequisitions(
    page: number = 1,
    pageSize: number = 10,
    userId: string,
    organisationId: string,
  ) {
    const { _page, _pageSize } = this.normalizePagination(page, pageSize);
    const skip = (_page - 1) * _pageSize;

    return await this.purchaseRequisitionRepository.find({
      where: {
        created_by: { id: userId },
        organisation: { id: organisationId },
        status: PurchaseRequisitionStatus.SAVED_FOR_LATER,
      },
      relations: ["created_by", "supplier", "department", "branch"],
      select: this.getBasicSelectFields(),
      take: _pageSize,
      skip,
    });
  }

  public async findOrgPurchaseRequisitionsByIds({
    organisationId,
    ids,
  }: {
    organisationId: string;
    ids: string[];
  }): Promise<PurchaseRequisition[]> {
    return await this.purchaseRequisitionRepository.find({
      where: {
        id: In(ids),
        organisation: { id: organisationId },
      },
      relations: ["created_by", "supplier", "items", "department", "branch"],
      select: this.getDetailedSelectFields(),
      order: { created_at: "DESC" },
    });
  }

  public async getPurchaseRequisition(
    query: any,
  ): Promise<PurchaseRequisition | null> {
    const pr = await this.purchaseRequisitionRepository.findOne(query);
    if (!pr) throw new NotFoundException("Purchase Requisition not found");
    return pr;
  }

  public async count(query: any): Promise<number> {
    return await this.purchaseRequisitionRepository.count(query);
  }

  private normalizePagination(
    page: number,
    pageSize: number,
  ): { _page: number; _pageSize: number } {
    return {
      _page: page && page > 0 ? page : 1,
      _pageSize: pageSize && pageSize > 0 ? pageSize : 10,
    };
  }

  private buildWhereConditions(
    userId: string,
    organisationId: string,
    startDate?: string,
    endDate?: string,
    status?: PurchaseRequisitionStatus,
  ): any {
    const whereConditions: any = { organisation: { id: organisationId } };

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

    if (
      status === PurchaseRequisitionStatus.INITIALIZED ||
      status === PurchaseRequisitionStatus.SAVED_FOR_LATER
    ) {
      whereConditions.status = status;
      whereConditions.created_by = { id: userId }; // restrict to current user
    } else if (status) {
      whereConditions.status = status; // any other status, no user restriction
    } else {
      // Default: exclude all draft statuses (INITIALIZED + SAVED_FOR_LATER)
      whereConditions.status = Not(
        In([
          PurchaseRequisitionStatus.INITIALIZED,
          PurchaseRequisitionStatus.SAVED_FOR_LATER,
        ]),
      );
    }

    return whereConditions;
  }

  private buildQueryOptions(
    whereConditions: any,
    page: number,
    pageSize: number,
    exportAll: boolean,
  ): any {
    const queryOptions: any = {
      where: whereConditions,
      relations: ["created_by", "supplier", "items", "department", "branch"],
      select: this.getDetailedSelectFields(),
      order: { created_at: "DESC" },
    };

    if (!exportAll) {
      queryOptions.take = pageSize;
      queryOptions.skip = (page - 1) * pageSize;
    }

    return queryOptions;
  }

  private getDetailedSelectFields() {
    return {
      created_by: { first_name: true },
      department: { id: true, name: true },
      branch: { id: true, name: true, address: true },
      supplier: { id: true, full_name: true },
      items: {
        item_name: true,
        unit_price: true,
        currency: true,
        pr_quantity: true,
        po_quantity: true,
      },
    };
  }

  private getBasicSelectFields() {
    return {
      created_by: { first_name: true },
      department: { id: true, name: true },
      branch: { id: true, name: true },
      supplier: { id: true, full_name: true },
    };
  }

  private buildMetadata(total: number, page: number, pageSize: number) {
    return {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
