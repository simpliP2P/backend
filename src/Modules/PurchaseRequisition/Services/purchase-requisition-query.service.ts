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

    console.log("Query Options:", queryOptions); // Debug log
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
    // Check if the requisitionId matches PR number pattern (more reliable than UUID regex)
    const isPRNumber =
      /^PR-?\d+$/i.test(requisitionId) || /^\d+$/.test(requisitionId);

    let pr: PurchaseRequisition | null;

    if (isPRNumber) {
      // Handle PR number search - normalize the input
      const normalizedNumber = requisitionId.replace(/^PR-?/i, "");
      const patterns = [
        `PR-${normalizedNumber}`,
        `PR-${normalizedNumber.padStart(2, "0")}`,
        `PR-${normalizedNumber.padStart(3, "0")}`,
      ];

      // Use query builder for flexible PR number matching
      pr = await this.purchaseRequisitionRepository
        .createQueryBuilder("pr")
        .leftJoinAndSelect("pr.created_by", "created_by")
        .leftJoinAndSelect("pr.supplier", "supplier")
        .leftJoinAndSelect("pr.items", "items")
        .leftJoinAndSelect("pr.department", "department")
        .leftJoinAndSelect("pr.branch", "branch")
        .select([
          "pr",
          "created_by.first_name",
          "supplier.id",
          "supplier.full_name",
          "items.item_name",
          "items.unit_price",
          "items.currency",
          "items.pr_quantity",
          "items.po_quantity",
          "department.id",
          "department.name",
          "branch.id",
          "branch.name",
          "branch.address",
        ])
        .where("pr.organisation_id = :organisationId", { organisationId })
        .andWhere(
          "(pr.pr_number ILIKE :pattern1 OR pr.pr_number ILIKE :pattern2 OR pr.pr_number ILIKE :pattern3)",
          {
            pattern1: patterns[0],
            pattern2: patterns[1],
            pattern3: patterns[2],
          },
        )
        .getOne();
    } else {
      // Handle UUID search (fallback for anything that doesn't match PR pattern)
      pr = await this.purchaseRequisitionRepository.findOne({
        where: {
          organisation: { id: organisationId },
          id: requisitionId,
        },
        relations: ["created_by", "supplier", "items", "department", "branch"],
        select: this.getDetailedSelectFields(),
      });
    }

    if (!pr) throw new NotFoundException("Purchase Requisition not found");

    const isSavedForLaterByUser =
      pr.created_by?.id === userId &&
      pr.status === PurchaseRequisitionStatus.SAVED_FOR_LATER;

    if (isSavedForLaterByUser) {
      throw new NotFoundException("Purchase Requisition not found");
    }

    return pr;
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

  // @ts-ignore
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
