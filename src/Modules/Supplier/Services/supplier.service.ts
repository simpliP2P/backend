import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Supplier } from "../Entities/supplier.entity";
import { CreateSupplierDto, UpdateSupplierDto } from "../Dtos/supplier.dto";
import { SupplierExists } from "src/Shared/Exceptions/app.exceptions";
import { HashHelper } from "src/Shared/Helpers/hash.helper";

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,

    private hashHelper: HashHelper,
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
        console.log(error);
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

  public async findAllByOrganisation(
    organisationId: string,
    page: number = 1,
    pageSize: number = 10,
  ) {
    let _page = page;
    let _pageSize = pageSize;
    if (isNaN(page) || page < 1) _page = 1;
    if (isNaN(pageSize) || pageSize < 1) _pageSize = 10;

    const skip = (_page - 1) * _pageSize; // Calculate the offset

    const [data, total] = await this.supplierRepository.findAndCount({
      where: { organisation: { id: organisationId } },
      relations: ["category"],
      take: _pageSize, // Limit the number of results
      skip, // Skip the previous results
      select: {
        category: {
          id: true,
          name: true,
        },
      },
    });

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

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  public async findOne(query: any) {
    return await this.supplierRepository.findOne(query);
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

    if (!supplier) {
      throw new NotFoundException(`Supplier not found`);
    }

    Object.assign(supplier, updateSupplierDto);

    return await this.supplierRepository.save(supplier);
  }

  public async removeSupplier(supplierId: string, organisationId: string) {
    const supplier = await this.findOneByOrganisation(
      supplierId,
      organisationId,
    );

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
    }

    await this.supplierRepository.remove(supplier);
  }

  public async count(query: any) {
    return await this.supplierRepository.count(query);
  }

  private async generateSupplierNumber(organisationId: string) {
    const tenantCode = this.hashHelper.generateHashFromId(organisationId);
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0"); // Month as 01, 02, ..., 12

    const lastSupplier = await this.supplierRepository
      .createQueryBuilder("sup")
      .where("sup.supplier_no LIKE :pattern", {
        pattern: `SUP-${tenantCode}-${yy}${mm}-%`,
      })
      .orderBy("sup.created_at", "DESC")
      .getOne();

    let sequence = 1;
    if (lastSupplier) {
      const lastSeq = lastSupplier.supplier_no.split("-").pop(); // Extract last sequence number
      sequence = parseInt(lastSeq || "0", 10) + 1;
    }

    return `SUP-${tenantCode}-${yy}${mm}-${String(sequence).padStart(3, "0")}`;
  }
}
