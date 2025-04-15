import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  SetMetadata,
} from "@nestjs/common";
import { OrganisationDepartmentService } from "../Services/organisation-department.service";
import { CreateDepartmentDto } from "../Dtos/organisation-department.dto";
import { OrganisationPermissionsGuard } from "src/Guards/permissions.guard";
import { PermissionType } from "../Enums/user-organisation.enum";

@Controller("organisations/:organisationId/departments")
export class OrganisationDepartmentController {
  constructor(
    private readonly organisationDepartmentService: OrganisationDepartmentService,
  ) {}

  @Post()
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_DEPARTMENTS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async createDepartment(
    @Param("organisationId") organisationId: string,
    @Body() data: CreateDepartmentDto,
  ) {
    try {
      const department =
        await this.organisationDepartmentService.createDepartment({
          ...data,
          organisation_id: organisationId,
        });

      return {
        status: "success",
        message: "Department created successfully",
        data: department,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get()
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.ORG_MEMBER,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getDepartments(
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
  ) {
    try {
      const department =
        await this.organisationDepartmentService.getDepartmentsByOrganisation(
          organisationId,
          page,
          pageSize,
        );

      return {
        status: "success",
        message: "Department fetched successfully",
        data: department,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":departmentId")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.ORG_MEMBER,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getDepartmentById(
    @Param("organisationId") organisationId: string,
    @Param("departmentId") departmentId: string,
  ) {
    try {
      const department =
        await this.organisationDepartmentService.getDepartmentById(
          organisationId,
          departmentId,
        );

      return {
        status: "success",
        message: "Department fetched successfully",
        data: department,
      };
    } catch (error) {
      throw error;
    }
  }
}
