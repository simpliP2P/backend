import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  SetMetadata,
  UseGuards,
} from "@nestjs/common";
import { OrganisationPermissionsGuard } from "src/Guards/permissions.guard";
import { PermissionType } from "../Enums/user-organisation.enum";
import { OrganisationService } from "../Services/organisation.service";
import {
  addUserToOrgDto,
  updateUserDetailsDto,
} from "../Dtos/organisation.dto";

@Controller("organisations")
export class OrganisationMemberController {
  constructor(private readonly organisationService: OrganisationService) {}

  /**
   * Member routes
   */
  @Post(":organisationId/invite-member")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_USERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async addMemberToOrganisation(
    @Param("organisationId") organisationId: string,
    @Body() userData: addUserToOrgDto,
  ) {
    try {
      await this.organisationService.addMemberToOrganisation(
        organisationId,
        userData,
      );

      return {
        status: "success",
        message: "Invitation sent to user successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/members")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async getMembers(
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
  ) {
    try {
      const data = await this.organisationService.getOrganisationMembers(
        organisationId,
        page,
        pageSize,
      );

      return {
        status: "success",
        message: "Members fetched successfully",
        data,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/members/:memberId")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async getMemberById(
    @Param("organisationId") organisationId: string,
    @Param("memberId") memberId: string,
  ) {
    try {
      const member = await this.organisationService.getOrganisationMember(
        organisationId,
        memberId,
      );

      return {
        status: "success",
        message: "Member fetched successfully",
        data: { member },
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch(":organisationId/members/:memberId")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async updateMemberDetails(
    @Param("organisationId") organisationId: string,
    @Param("memberId") userId: string,
    @Body() reqBody: updateUserDetailsDto,
  ) {
    try {
      const member = await this.organisationService.updateMemberDetails(
        userId,
        organisationId,
        reqBody,
      );

      return {
        status: "success",
        message: "Updated successfully",
        data: member,
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch(":organisationId/members/:memberId/deactivate")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async deactivateMember(
    @Param("organisationId") organisationId: string,
    @Param("memberId") userId: string,
  ) {
    try {
      await this.organisationService.deactivateMember(userId, organisationId);

      return {
        status: "success",
        message: "Deactivated successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch(":organisationId/members/:memberId/reactivate")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async reactivateMember(
    @Param("organisationId") organisationId: string,
    @Param("memberId") userId: string,
  ) {
    try {
      await this.organisationService.reactivateMember(userId, organisationId);

      return {
        status: "success",
        message: "Reactivated successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(":organisationId/members/:memberId")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  async removeMember(
    @Param("organisationId") organisationId: string,
    @Param("memberId") userId: string,
  ) {
    try {
      await this.organisationService.removeMember(userId, organisationId);

      return {
        status: "success",
        message: "Removed successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }
}
