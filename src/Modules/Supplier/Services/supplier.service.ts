import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Between,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from "typeorm";
import { Supplier } from "../Entities/supplier.entity";
import { CreateSupplierDto, UpdateSupplierDto } from "../Dtos/supplier.dto";
import { SupplierExists } from "src/Shared/Exceptions/app.exceptions";
import {
  IGetAllSuppliersByOrg,
  ISearchSuppliersInput,
} from "../Types/supplier.types";

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
  ) {}

  public async addSupplierToOrganisation(
    createSupplierDto: CreateSupplierDto,
    organisationId: string,
  ) {
    const { category, ...otherDetails } = createSupplierDto;

    const supplier_no = await this.generateSupplierNumber(organisationId);

    try {
      const supplier = this.supplierRepository.create({
        ...otherDetails,
        organisation: { id: organisationId },
        category: { id: category },
        supplier_no,
      });

      return await this.supplierRepository.save(supplier);
    } catch (error) {
      if (error.code === "23505") {
        throw new SupplierExists();
      } else if (error.code === "23503") {
        throw new NotFoundException(
          `Category with ID ${category} does not exist`,
        );
      } else {
        throw new Error(error.message);
      }
    }
  }

  public async findAllByOrganisation({
    organisationId,
    page,
    pageSize,
    startDate,
    endDate,
    exportAll = false,
  }: IGetAllSuppliersByOrg) {
    let _page = page && page > 0 ? page : 1;
    let _pageSize = pageSize && pageSize > 0 ? pageSize : 10;

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

    // Build query options
    const queryOptions: any = {
      where: { organisation: { id: organisationId } },
      relations: ["category"],
      select: {
        category: {
          id: true,
          name: true,
        },
      },
      order: {
        created_at: "DESC",
      },
    };

    // Enforce pagination for normal API calls, bypass when exporting
    if (!exportAll) {
      queryOptions.take = _pageSize;
      queryOptions.skip = (_page - 1) * _pageSize;
    }

    const [data, total] =
      await this.supplierRepository.findAndCount(queryOptions);

    return {
      data,
      metadata: {
        total,
        page: _page,
        pageSize: _pageSize,
        totalPages: Math.ceil(total / _pageSize),
      },
    };
  }

  public async findOneByOrganisation(id: string, organisationId: string) {
    const supplier = await this.findOne({
      where: {
        id,
        organisation: { id: organisationId },
      },
      relations: ["category"],
      select: {
        category: {
          id: true,
          name: true,
        },
      },
    });

    return supplier;
  }

  public async findOne(query: any) {
    const supplier = await this.supplierRepository.findOne(query);

    if (!supplier) throw new NotFoundException("Supplier not found");

    return supplier;
  }

  public async updateOrganisationSupplier(
    supplierId: string,
    organisationId: string,
    updateSupplierDto: UpdateSupplierDto,
  ) {
    const supplier = await this.findOneByOrganisation(
      supplierId,
      organisationId,
    );

    Object.assign(supplier, updateSupplierDto);

    return await this.supplierRepository.save(supplier);
  }

  public async removeSupplier(supplierId: string, organisationId: string) {
    const supplier = await this.findOneByOrganisation(
      supplierId,
      organisationId,
    );

    await this.supplierRepository.softRemove(supplier);
  }

  public async count(query: any) {
    return await this.supplierRepository.count(query);
  }

  public async findOrgSuppliersByIds({
    organisationId,
    ids,
  }: {
    organisationId: string;
    ids: string[];
  }): Promise<Supplier[]> {
    return await this.supplierRepository.find({
      where: {
        id: In(ids),
        organisation: { id: organisationId },
      },
      relations: ["category"],
      select: {
        category: {
          id: true,
          name: true,
        },
      },
      order: {
        created_at: "DESC",
      },
    });
  }

  public async searchSuppliers({
    organisationId,
    query,
    page,
    pageSize,
  }: ISearchSuppliersInput): Promise<{
    data: Supplier[];
    metadata: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
    let _page = page && page > 0 ? page : 1;
    let _pageSize = pageSize && pageSize > 0 ? pageSize : 10;

    const qb = this.supplierRepository
      .createQueryBuilder("supplier")
      .leftJoinAndSelect("supplier.category", "category")
      .where("supplier.organisation_id = :organisationId", { organisationId });

    // Handle edge case: if query is just "SUP" or "sup", return empty results
    if (/^SUP-?$/i.test(query.trim())) {
      return {
        data: [],
        metadata: {
          total: 0,
          page: _page,
          pageSize: _pageSize,
          totalPages: 0,
        },
      };
    }

    // if query contains only numbers (with optional SUP- prefix), treat as number search
    // Otherwise, treat as name search
    const isNumberSearch = /^(SUP-?)?\d+$/i.test(query.trim());

    if (isNumberSearch) {
      // Handle number search: SUP-001, 1, 001 formats
      const normalizedNumber = query.replace(/^SUP-?/i, "");
      const patterns = [
        `%SUP-${normalizedNumber}%`,
        `%SUP-${normalizedNumber.padStart(2, "0")}%`,
        `%SUP-${normalizedNumber.padStart(3, "0")}%`,
      ];
      qb.andWhere(
        "(supplier.supplier_no ILIKE :pattern1 OR supplier.supplier_no ILIKE :pattern2 OR supplier.supplier_no ILIKE :pattern3)",
        {
          pattern1: patterns[0],
          pattern2: patterns[1],
          pattern3: patterns[2],
        },
      );
    } else {
      // Handle name search
      qb.andWhere("supplier.full_name ILIKE :name", { name: `%${query}%` });
    }

    qb.orderBy("supplier.created_at", "DESC")
      .take(_pageSize)
      .skip((_page - 1) * _pageSize);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      metadata: {
        total,
        page: _page,
        pageSize: _pageSize,
        totalPages: Math.ceil(total / _pageSize),
      },
    };
  }

  private async generateSupplierNumber(
    organisationId: string,
  ): Promise<string> {
    const lastSupplier = await this.supplierRepository
      .createQueryBuilder("sup")
      .where("sup.organisation_id = :orgId", { orgId: organisationId })
      .orderBy("sup.created_at", "DESC")
      .getOne();

    let sequence = 1;
    if (lastSupplier) {
      const match = lastSupplier.supplier_no.match(/^SUP-(\d+)$/);
      sequence = match ? parseInt(match[1], 10) + 1 : 1;
    }

    return `SUP-${String(sequence).padStart(3, "0")}`;
  }
}
