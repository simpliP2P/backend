import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  SetMetadata,
  UseGuards,
} from "@nestjs/common";
import { OrganisationPermissionsGuard } from "src/Guards/permissions.guard";
import { PermissionType } from "../Enums/user-organisation.enum";
import { SuppliersService } from "src/Modules/Supplier/Services/supplier.service";
import {
  CreateSupplierDto,
  UpdateSupplierDto,
} from "src/Modules/Supplier/Dtos/supplier.dto";

@Controller("organisations")
export class OrganisationSupplierController {
  constructor(private readonly supplierService: SuppliersService) {}

  /**
   * Supplier routes
   */
  @Post(":organisationId/suppliers")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    // PermissionType.MANAGE_USERS,
    PermissionType.MANAGE_SUPPLIERS,
    PermissionType.CREATE_SUPPLIERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async addSupplierToOrganisation(
    @Param("organisationId") organisationId: string,
    @Body() reqBody: CreateSupplierDto,
  ) {
    try {
      const supplier = await this.supplierService.addSupplierToOrganisation(
        reqBody,
        organisationId,
      );

      return {
        status: "success",
        message: "Created supplier successfully",
        data: { supplier },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/suppliers")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.ORG_MEMBER,
    PermissionType.MANAGE_SUPPLIERS,
    PermissionType.GET_SUPPLIERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getAllSuppliers(
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
  ) {
    try {
      const { data, metadata } =
        await this.supplierService.findAllByOrganisation({
          organisationId,
          page,
          pageSize,
        });

      return {
        status: "success",
        message: "Suppliers fetched successfully",
        data,
        metadata,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/suppliers/:supplierId")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.ORG_MEMBER,
    PermissionType.MANAGE_SUPPLIERS,
    PermissionType.GET_SUPPLIERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getSupplierById(
    @Param("organisationId") organisationId: string,
    @Param("supplierId") supplierId: string,
  ) {
    try {
      const supplier = await this.supplierService.findOneByOrganisation(
        supplierId,
        organisationId,
      );

      return {
        status: "success",
        message: "Supplier fetched successfully",
        data: supplier,
      };
    } catch (error) {
      throw error;
    }
  }

  @Put(":organisationId/suppliers/:supplierId")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_SUPPLIERS,
    PermissionType.UPDATE_SUPPLIERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async updateSupplier(
    @Param("organisationId") organisationId: string,
    @Param("supplierId") supplierId: string,
    @Body() reqBody: UpdateSupplierDto,
  ) {
    try {
      const supplier = await this.supplierService.updateOrganisationSupplier(
        supplierId,
        organisationId,
        reqBody,
      );

      return {
        status: "success",
        message: "Supplier updated successfully",
        data: supplier,
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(":organisationId/suppliers/:supplierId")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_SUPPLIERS,
    PermissionType.DELETE_SUPPLIERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async deleteSupplier(
    @Param("organisationId") organisationId: string,
    @Param("supplierId") supplierId: string,
  ) {
    try {
      await this.supplierService.removeSupplier(supplierId, organisationId);

      return {
        status: "success",
        message: "Supplier deleted successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }
}
