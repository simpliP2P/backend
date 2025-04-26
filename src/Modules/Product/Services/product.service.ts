import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Product } from "../Entities/product.entity";
import { CreateProductDto, UpdateProductDto } from "../Dtos/product.dto";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";

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

  public async findAllProductsByOrganisation(
    organisationId: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<{
    data: Product[];
    metadata: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
    let _page = page;
    let _pageSize = pageSize;
    if (isNaN(page) || page < 1) _page = 1;
    if (isNaN(pageSize) || pageSize < 1) _pageSize = 10;

    const skip = (_page - 1) * _pageSize; // Calculate the offset

    const [data, total] = await this.productRepository.findAndCount({
      where: { organisation: { id: organisationId } },
      relations: ["category"],
      select: {
        category: {
          id: true,
          name: true,
        },
      },
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

  private async generateInvNumber(organisationId: string) {
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
