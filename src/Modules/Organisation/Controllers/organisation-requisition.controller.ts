import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { PurchaseRequisitionService } from "src/Modules/PurchaseRequisition/Services/purchase-requisition.service";
import { PurchaseRequisitionStatus } from "src/Modules/PurchaseRequisition/Enums/purchase-requisition.enum";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";
import {
  ApprovalDataDto,
  CreatePurchaseRequisitionDto,
  UpdatePurchaseRequisitionDto,
} from "src/Modules/PurchaseRequisition/Dtos/purchase-requisition.dto";

@Controller("organisations")
export class OrganisationRequisitionController {
  constructor(
    private readonly purchaseRequisitionService: PurchaseRequisitionService,
  ) {}

  /**
   * Purchase Requisition routes
   */
  @Get(":organisationId/requisitions")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.GET_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getRequisitions(
    @Param("organisationId") organisationId: string,
    @Query("status") status: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    try {
      if (
        status &&
        !Object.values(PurchaseRequisitionStatus).includes(
          status as PurchaseRequisitionStatus,
        )
      ) {
        throw new BadRequestException("Invalid status");
      }

      const data =
        await this.purchaseRequisitionService.getAllPurchaseRequisitions({
          organisationId,
          status: status as PurchaseRequisitionStatus,
          page,
          pageSize,
          startDate,
          endDate,
        });

      return {
        status: "success",
        message: "Requisitions fetched successfully.",
        data,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post(":organisationId/requisitions/saved")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.CREATE_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async saveForLater(
    @Param("organisationId") organisationId: string,
    @Body() data: CreatePurchaseRequisitionDto,
    @Req() req: Request,
  ) {
    try {
      const userId = req.user.sub;

      if (!userId) return;

      const purchaseRequisition =
        await this.purchaseRequisitionService.createPurchaseRequisition(
          organisationId,
          userId,
          data,
        );

      return {
        status: "success",
        message: "Purchase requisition saved successfully",
        data: { purchase_requisition: purchaseRequisition },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/requisitions/:requisitionId")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.GET_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getRequisitionById(
    @Req() req: Request,
    @Param("organisationId") organisationId: string,
    @Param("requisitionId") requisitionId: string,
  ) {
    try {
      const userId = req.user.sub;
      if (!userId) return;

      const requisition =
        await this.purchaseRequisitionService.getPurchaseRequisitionById(
          organisationId,
          requisitionId,
          userId,
        );

      return {
        status: "success",
        message: "Requisition fetched successfully.",
        data: { requisition },
      };
    } catch (error) {
      throw error;
    }
  }

  @Put(":organisationId/requisitions/:requisitionId")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.UPDATE_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async updateRequisition(
    @Param("organisationId", ParseUUIDPipe) organisationId: string,
    @Param("requisitionId", ParseUUIDPipe) requisitionId: string,
    @Body() updateData: UpdatePurchaseRequisitionDto,
  ) {
    try {
      const updatedRequisition =
        await this.purchaseRequisitionService.updatePurchaseRequisition(
          organisationId,
          requisitionId,
          updateData,
        );

      return {
        status: "success",
        message: "Purchase requisition updated successfully",
        data: { requisition: updatedRequisition },
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch(":organisationId/requisitions/:id/approval")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.APPROVE_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async updateApproval(
    @Param("organisationId") organisationId: string,
    @Param("id") requisitionId: string,
    @Req() req: Request,
    @Body()
    approvalData: ApprovalDataDto,
  ) {
    try {
      const userId = req.user.sub;

      await this.purchaseRequisitionService.updateApprovalDetails(
        requisitionId,
        organisationId,
        { ...approvalData, approved_by: userId },
      );

      return {
        status: "success",
        message: "Purchase requisition updated successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }
}
