import {
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
import { OrganisationCategoryService } from "../Services/organisation-category.service";

@Controller("organisations")
export class OrganisationCategoryController {
  constructor(
    private readonly organisationCategoryService: OrganisationCategoryService,
  ) {}

  /**
   * Category routes
   */
  @Post(":organisationId/categories")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async createCategory(
    @Param("organisationId") organisationId: string,
    @Body() data: { name: string },
  ) {
    try {
      const category = await this.organisationCategoryService.createCategory({
        organisationId: organisationId,
        name: data.name,
      });

      return {
        status: "success",
        message: "Category created successfully",
        data: category,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/categories")
  @SetMetadata("permissions", [PermissionType.OWNER, PermissionType.ORG_MEMBER])
  @UseGuards(OrganisationPermissionsGuard)
  async getCategories(
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
  ) {
    try {
      const data =
        await this.organisationCategoryService.getCategoriesByOrganisation(
          organisationId,
          page,
          pageSize,
        );

      return {
        status: "success",
        message: "Categories fetched successfully",
        data,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/categories/:categoryId")
  @SetMetadata("permissions", [PermissionType.OWNER, PermissionType.ORG_MEMBER])
  @UseGuards(OrganisationPermissionsGuard)
  async getCategoryById(
    @Param("organisationId") organisationId: string,
    @Param("categoryId") categoryId: string,
  ) {
    try {
      const category = await this.organisationCategoryService.getCategoryById(
        organisationId,
        categoryId,
      );

      return {
        status: "success",
        message: "Category fetched successfully",
        data: category,
      };
    } catch (error) {
      throw error;
    }
  }

  @Put(":organisationId/categories/:categoryId")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async editCategory(
    @Param("organisationId") organisationId: string,
    @Param("categoryId") categoryId: string,
    @Body() data: { name: string },
  ) {
    try {
      const category = await this.organisationCategoryService.editCategory(
        organisationId,
        categoryId,
        data,
      );

      return {
        status: "success",
        message: "Category updated successfully",
        data: category,
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(":organisationId/categories/:categoryId")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async deleteCategory(
    @Param("organisationId") organisationId: string,
    @Param("categoryId") categoryId: string,
    @Req() req: Request,
  ) {
    try {
      const userId = req.user.sub;

      await this.organisationCategoryService.deleteCategory(
        userId,
        categoryId,
        organisationId,
      );

      return {
        status: "success",
        message: "Category deleted successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }
}
