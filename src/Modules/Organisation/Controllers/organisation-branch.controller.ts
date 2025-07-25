import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  SetMetadata,
  Put,
  Delete,
} from "@nestjs/common";
import { OrganisationBranchService } from "../Services/organisation-branch.service";
import {
  CreateBranchDto,
  UpdateBranchDto,
} from "../Dtos/organisation-branch.dto";
import { OrganisationPermissionsGuard } from "src/Guards/permissions.guard";
import { PermissionType } from "../Enums/user-organisation.enum";

@Controller("organisations/:organisationId/branches")
export class OrganisationBranchController {
  constructor(
    private readonly organisationBranchService: OrganisationBranchService,
  ) {}

  @Post()
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_BRANCHES,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async createBranch(
    @Param("organisationId") organisationId: string,
    @Body() data: CreateBranchDto,
  ) {
    try {
      const branch = await this.organisationBranchService.createBranch({
        ...data,
        organisationId,
      });

      return {
        status: "success",
        message: "Branch created successfully",
        data: branch,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get()
  @SetMetadata("permissions", [PermissionType.OWNER, PermissionType.ORG_MEMBER])
  @UseGuards(OrganisationPermissionsGuard)
  async getBranches(
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
  ) {
    try {
      const branch =
        await this.organisationBranchService.getBranchesByOrganisation(
          organisationId,
          page,
          pageSize,
        );

      return {
        status: "success",
        message: "Branches fetched successfully",
        data: branch,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":branchId")
  @SetMetadata("permissions", [PermissionType.OWNER, PermissionType.ORG_MEMBER])
  @UseGuards(OrganisationPermissionsGuard)
  async getBranchById(
    @Param("organisationId") organisationId: string,
    @Param("branchId") branchId: string,
  ) {
    try {
      const branch = await this.organisationBranchService.getBranchById(
        organisationId,
        branchId,
      );

      return {
        status: "success",
        message: "Branch fetched successfully",
        data: branch,
      };
    } catch (error) {
      throw error;
    }
  }

  @Put(":branchId")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_BRANCHES,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async updateBranch(
    @Param("organisationId") organisationId: string,
    @Param("branchId") branchId: string,
    @Body() data: UpdateBranchDto,
  ) {
    try {
      const branch = await this.organisationBranchService.updateBranch(
        organisationId,
        branchId,
        data,
      );

      return {
        status: "success",
        message: "Branch updated successfully",
        data: branch,
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(":branchId")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_BRANCHES,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async deleteBranch(
    @Param("organisationId") organisationId: string,
    @Param("branchId") branchId: string,
  ) {
    try {
      await this.organisationBranchService.deleteBranch(
        organisationId,
        branchId,
      );

      return {
        status: "success",
        message: "Branch deleted successfully",
      };
    } catch (error) {
      throw error;
    }
  }
}
