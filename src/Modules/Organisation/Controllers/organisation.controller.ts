import {
  Body,
  Controller,
  Param,
  Post,
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

@Controller("organisations")
export class OrganisationController {
  constructor(private readonly organisationService: OrganisationService) {}

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
}
