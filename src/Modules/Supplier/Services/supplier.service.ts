import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Supplier } from "../Entities/supplier.entity";
import { CreateSupplierDto, UpdateSupplierDto } from "../Dtos/supplier.dto";
import { SupplierExists } from "src/Shared/Exceptions/app.exceptions";

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
    try {
      const supplier = this.supplierRepository.create({
        ...createSupplierDto,
        organisation: { id: organisationId },
      });

      return await this.supplierRepository.save(supplier);
    } catch (error) {
      if (error.code === "23505") {
        throw new SupplierExists();
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
      take: _pageSize, // Limit the number of results
      skip, // Skip the previous results
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
      throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
    }

    const updatedSupplier = await this.supplierRepository.save({
      ...supplier,
      ...updateSupplierDto,
    });

    return updatedSupplier;
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
}
