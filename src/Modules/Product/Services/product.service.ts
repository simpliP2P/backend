import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Between,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from "typeorm";
import { Product } from "../Entities/product.entity";
import { CreateProductDto, UpdateProductDto } from "../Dtos/product.dto";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";
import { IGetAllProductsInput } from "../Types/product.types";

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  // Create a new product
  public async addProductToOrganisation(
    organisationId: string,
    createProductDto: CreateProductDto,
  ): Promise<Product> {
    const foundProduct = await this.productRepository.findOne({
      where: {
        name: createProductDto.name,
        organisation: { id: organisationId },
      },
    });

    if (foundProduct) throw new BadRequestException(`Product already exists.`);

    const { category, ...productData } = createProductDto;

    const invNumber = await this.generateInvNumber(organisationId);

    const product = this.productRepository.create({
      ...productData,
      organisation: { id: organisationId },
      category: { id: category },
      inv_number: invNumber,
    });

    try {
      return await this.productRepository.save(product);
    } catch (error) {
      if (error.code === "23505") {
        // Unique violation
        if (error.constraint === "unique_product_code_per_org") {
          throw new BadRequestException(
            "Product code already exists for this organisation",
          );
        }
      }
      // For other unexpected errors
      throw error;
    }
  }

  public async findAllProductsByOrganisation({
    organisationId,
    page,
    pageSize,
    startDate,
    endDate,
    exportAll = false,
  }: IGetAllProductsInput): Promise<{
    data: Product[];
    metadata: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
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
      where: whereConditions,
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
      await this.productRepository.findAndCount(queryOptions);

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

  // Get a single product
  public async findSingleOrganisationProduct(
    organisationId: string,
    productId: string,
  ): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: productId, organisation: { id: organisationId } },
      relations: ["category"],
      select: {
        category: {
          id: true,
          name: true,
        },
      },
    });
    if (!product) {
      throw new NotFoundException(`Product not found.`);
    }
    return product;
  }

  // Update a product
  public async updateOrganisationProduct(
    organisationId: string,
    productId: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findSingleOrganisationProduct(
      organisationId,
      productId,
    );

    if (!product) {
      throw new NotFoundException(`Product not found`);
    }
    Object.assign(product, updateProductDto);

    try {
      return await this.productRepository.save(product);
    } catch (error) {
      if (error.code === "23505") {
        // Unique violation
        if (error.constraint === "unique_product_code_per_org") {
          throw new BadRequestException(
            "Product code already exists for this organisation",
          );
        }
      }
      // For other unexpected errors
      throw error;
    }
  }

  // Delete a product
  public async deleteOrganisationProduct(
    organisationId: string,
    productId: string,
  ): Promise<void> {
    const product = await this.findSingleOrganisationProduct(
      organisationId,
      productId,
    );
    await this.productRepository.remove(product);
  }

  public async count(query: any) {
    return this.productRepository.count(query);
  }

  public async findOrgProductsByIds({
    organisationId,
    ids,
  }: {
    organisationId: string;
    ids: string[];
  }): Promise<Product[]> {
    return await this.productRepository.find({
      where: {
        id: In(ids),
        organisation: { id: organisationId },
      },
      relations: ["category"],
      select: {
        category: {
          name: true,
        },
      },
      order: {
        created_at: "DESC",
      },
    });
  }

  public async generateInvNumber(organisationId: string) {
    const lastProduct = await this.productRepository
      .createQueryBuilder("product")
      .where("product.organisation_id = :orgId", { orgId: organisationId })
      .andWhere("product.inv_number IS NOT NULL")
      .orderBy("product.created_at", "DESC")
      .getOne();

    let sequence = 1;
    if (lastProduct) {
      const match = lastProduct.inv_number.match(/^INV-(\d+)$/);
      sequence = match ? parseInt(match[1], 10) + 1 : 1;
    }

    return `INV-${String(sequence).padStart(3, "0")}`;
  }
}
