import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  SetMetadata,
  UseGuards,
} from "@nestjs/common";
import { OrganisationService } from "../Services/organisation.service";
import {
  acceptInvitationDto,
  addUserToOrgDto,
  CreateOrganisationDto,
} from "../Dtos/organisation.dto";
import { Request } from "express";
import { OrganisationPermissionsGuard } from "src/Guards/permissions.guard";
import { PermissionType } from "../Enums/userOrganisation.enum";
import { Public } from "src/Shared/Decorators/custom.decorator";
import { SuppliersService } from "src/Modules/Supplier/Services/supplier.service";
import { CreateSupplierDto, UpdateSupplierDto } from "src/Modules/Supplier/Dtos/supplier.dto";

@Controller("organisations")
export class OrganisationController {
  constructor(
    private readonly organisationService: OrganisationService,
    private readonly supplierService: SuppliersService,
  ) {}

  @Post()
  async createOrganisation(
    @Body() createOrganisationDto: CreateOrganisationDto,
    @Req() req: Request,
  ) {
    try {
      const organisation = await this.organisationService.createOrganisation(
        createOrganisationDto,
        req.user.sub,
      );

      return {
        status: "success",
        message: "organisation created successfully",
        data: organisation,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post(":organisationId/invite-user")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_USERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async addUserToOrganisation(
    @Param("organisationId") orgId: string,
    @Body() userData: addUserToOrgDto,
  ) {
    try {
      await this.organisationService.addUserToOrganisation(orgId, userData);

      return {
        status: "success",
        message: "Invitation sent to user successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }

  @Public()
  @Post(":organisationId/accept-invitation")
  async acceptInvitation(
    @Param("organisationId") orgId: string,
    @Body() reqBody: acceptInvitationDto,
  ) {
    try {
      await this.organisationService.acceptInvitation({
        token: reqBody.token,
        organisationId: orgId,
        newPassword: reqBody.newPassword,
      });

      return {
        status: "success",
        message: "You are now a member of the organisation",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }

  @Post(":organisationId/suppliers")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_USERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async addSupplierToOrganisation(
    @Param("organisationId") orgId: string,
    @Body() reqBody: CreateSupplierDto,
  ) {
    try {
      const supplier = await this.supplierService.addSupplierToOrganisation(
        reqBody,
        orgId,
      );

      return {
        status: "success",
        message: "Created supplier successfully",
        data: { ...supplier },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/suppliers")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_SUPPLIERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getAllSuppliers(@Param("organisationId") orgId: string) {
    try {
      const { data, metadata } =
        await this.supplierService.findAllByOrganisation(orgId);

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
    PermissionType.MANAGE_SUPPLIERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getSupplierById(
    @Param("organisationId") orgId: string,
    @Param("supplierId") supplierId: string,
  ) {
    try {
      const supplier = await this.supplierService.findOneByOrganisation(
        supplierId,
        orgId,
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
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async updateSupplier(
    @Param("organisationId") orgId: string,
    @Param("supplierId") supplierId: string,
    @Body() reqBody: UpdateSupplierDto,
  ) {
    try {
      const supplier = await this.supplierService.updateOrganisationSupplier(
        supplierId,
        orgId,
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
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async deleteSupplier(
    @Param("organisationId") orgId: string,
    @Param("supplierId") supplierId: string,
  ) {
    try {
      await this.supplierService.removeSupplier(
        supplierId,
        orgId,
      );

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
