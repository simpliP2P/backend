import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  SetMetadata,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { OrganisationPermissionsGuard } from "src/Guards/permissions.guard";
import { PermissionType } from "../Enums/user-organisation.enum";
import { ProductService } from "src/Modules/Product/Services/product.service";
import {
  CreateProductDto,
  UpdateProductDto,
} from "src/Modules/Product/Dtos/product.dto";

@Controller("organisations")
export class OrganisationProductController {
  constructor(private readonly productService: ProductService) {}

  /**
   * Products routes
   */
  @Post(":organisationId/products")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PRODUCTS,
    PermissionType.CREATE_PRODUCTS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async createProduct(
    @Param("organisationId") organisationId: string,
    @Body() data: CreateProductDto,
    @Req() req: Request,
  ) {
    try {
      const userId = req.user.sub;

      if (!userId) return;

      const createdProduct = await this.productService.addProductToOrganisation(
        organisationId,
        data,
      );

      return {
        status: "success",
        message: "Product created successfully",
        data: createdProduct,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/products/search")
  @SetMetadata("permissions", [PermissionType.ORG_MEMBER])
  @UseGuards(OrganisationPermissionsGuard)
  async searchProducts(
    @Param("organisationId") organisationId: string,
    @Query("q") name: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
  ) {
    try {
      if (!name) throw new BadRequestException("Search query is required");

      const { data, metadata } = await this.productService.searchProductsByName(
        {
          organisationId,
          name,
          page,
          pageSize,
        },
      );

      return {
        status: "success",
        message: "Products searched successfully",
        data,
        metadata,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/products")
  @SetMetadata("permissions", [PermissionType.ORG_MEMBER])
  @UseGuards(OrganisationPermissionsGuard)
  async getAllProducts(
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
  ) {
    try {
      const { data, metadata } =
        await this.productService.findAllProductsByOrganisation({
          organisationId,
          page,
          pageSize,
        });

      return {
        status: "success",
        message: "Products fetched successfully",
        data,
        metadata,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/products/:productId")
  @SetMetadata("permissions", [PermissionType.ORG_MEMBER])
  @UseGuards(OrganisationPermissionsGuard)
  async getProductById(
    @Param("organisationId") organisationId: string,
    @Param("productId") productId: string,
  ) {
    try {
      const product = await this.productService.findSingleOrganisationProduct(
        organisationId,
        productId,
      );

      return {
        status: "success",
        message: "Product fetched successfully",
        data: product,
      };
    } catch (error) {
      throw error;
    }
  }

  @Put(":organisationId/products/:productId")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PRODUCTS,
    PermissionType.UPDATE_PRODUCTS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async updateProduct(
    @Param("organisationId") organisationId: string,
    @Param("productId") productId: string,
    @Body() data: UpdateProductDto,
  ) {
    try {
      const updatedProduct =
        await this.productService.updateOrganisationProduct(
          organisationId,
          productId,
          data,
        );

      return {
        status: "success",
        message: "Product updated successfully",
        data: updatedProduct,
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(":organisationId/products/:productId")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PRODUCTS,
    PermissionType.DELETE_PRODUCTS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async deleteProduct(
    @Param("organisationId") organisationId: string,
    @Param("productId") productId: string,
  ) {
    try {
      await this.productService.deleteOrganisationProduct(
        organisationId,
        productId,
      );

      return {
        status: "success",
        message: "Product deleted successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }
}
