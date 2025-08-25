import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  SetMetadata,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { OrganisationService } from "../Services/organisation.service";
import {
  acceptInvitationDto,
  CreateOrganisationDto,
  UpdateOrganisationDto,
} from "../Dtos/organisation.dto";
import { Request } from "express";
import { OrganisationPermissionsGuard } from "src/Guards/permissions.guard";
import { PermissionType } from "../Enums/user-organisation.enum";
import { Public } from "src/Shared/Decorators/custom.decorator";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiResponse } from "src/Shared/Interfaces/api-response.interface";
import { AuditLogsService } from "src/Modules/AuditLogs/Services/audit-logs.service";

@Controller("organisations")
export class OrganisationCoreController {
  constructor(
    private readonly organisationService: OrganisationService,
    private readonly auditLogsService: AuditLogsService,
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

  @Get(":organisationId")
  @SetMetadata("permissions", [PermissionType.ORG_MEMBER])
  @UseGuards(OrganisationPermissionsGuard)
  async getOrganisation(@Param("organisationId") organisationId: string) {
    try {
      const organisation = await this.organisationService.findOrganisation({
        where: { id: organisationId },
      });

      return {
        status: "success",
        message: "Organisation fetched successfully",
        data: organisation,
      };
    } catch (error) {
      throw error;
    }
  }

  @Put(":organisationId")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async updateOrganisation(
    @Param("organisationId") organisationId: string,
    @Body() data: UpdateOrganisationDto,
  ) {
    try {
      const organisation =
        await this.organisationService.updateOrganisationDetails(
          organisationId,
          data,
        );

      return {
        status: "success",
        message: "Organisation updated successfully",
        data: organisation,
      };
    } catch (error) {
      throw error;
    }
  }

  @Public()
  @Post(":organisationId/accept-invitation")
  async acceptInvitation(
    @Param("organisationId") organisationId: string,
    @Body() reqBody: acceptInvitationDto,
  ) {
    try {
      await this.organisationService.acceptInvitation({
        token: reqBody.token,
        organisationId: organisationId,
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

  @Get(":organisationId/dashboard")
  @SetMetadata("permissions", [PermissionType.ORG_MEMBER])
  @UseGuards(OrganisationPermissionsGuard)
  async dashboard(@Param("organisationId") organisationId: string) {
    try {
      const organisations =
        await this.organisationService.getOrganisationMetrics(organisationId);

      return {
        status: "success",
        message: "Metrics fetched successfully",
        data: organisations,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post(":organisationId/logo")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 0.1 * 1024 * 1024 }, // max: approx. 100KB
      fileFilter: (_, file, callback) => {
        if (!file.mimetype.match(/image\/(jpeg|png|jpg)$/)) {
          return callback(new BadRequestException("Invalid file type"), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadLogo(
    @Param("organisationId") organisationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ): Promise<ApiResponse<{ url: string }>> {
    try {
      if (!file) {
        throw new BadRequestException("No file uploaded");
      }

      const url = await this.organisationService.uploadLogo(
        organisationId,
        file,
        req,
      );

      return {
        status: "success",
        message: "logo uploaded successfully",
        data: { url },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Audit logs routes
   */
  @Get(":organisationId/audit-logs")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async getAuditLogs(
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
  ) {
    try {
      const data = await this.auditLogsService.getAllAuditLogsByOrganisation({
        organisationId,
        page,
        pageSize,
      });

      return {
        status: "success",
        message: "Audit logs fetched successfully",
        data,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/audit-logs/:userId")
  @SetMetadata("permissions", [PermissionType.ORG_MEMBER])
  @UseGuards(OrganisationPermissionsGuard)
  async getAuditLogsByUser(
    @Req() req: Request,
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
  ) {
    try {
      const userId = req.user.sub;
      const data = await this.auditLogsService.getAllAuditLogsByUser(
        organisationId,
        userId,
        page,
        pageSize,
      );

      return {
        status: "success",
        message: "Audit logs fetched successfully",
        data: { data },
      };
    } catch (error) {
      throw error;
    }
  }
}
