import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { User } from "src/Modules/User/Entities/user.entity";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";
import { ApiResponse } from "src/Shared/Interfaces/api-response.interface";
import { PurchaseRequisition } from "src/Modules/PurchaseRequisition/Entities/purchase-requisition.entity";
import { OrganisationDepartment } from "../Entities/organisation-department.entity";
import { Supplier } from "src/Modules/Supplier/Entities/supplier.entity";
import { OrganisationBranch } from "../Entities/organisation-branch.entity";
import {
  ApprovalDataDto,
  CreatePurchaseRequisitionDto,
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
      const isValidStatus =
        status &&
        Object.values(PurchaseRequisitionStatus).includes(
          status as PurchaseRequisitionStatus,
        );
      const isRestrictedStatus =
        status === PurchaseRequisitionStatus.SAVED_FOR_LATER ||
        status === PurchaseRequisitionStatus.INITIALIZED;

      if (isValidStatus && isRestrictedStatus) {
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
          {
            ...data,
            created_by: { id: userId } as User,
            department: { id: data.department_id } as OrganisationDepartment,
            supplier: { id: data.supplier_id } as Supplier,
            branch: { id: data.branch_id } as OrganisationBranch,
            status: PurchaseRequisitionStatus.SAVED_FOR_LATER,
          },
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

  @Get(":organisationId/requisitions/saved")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.GET_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getRequisitionsSavedForLater(
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
    @Req() req: Request,
  ): Promise<ApiResponse<{ requisitions: PurchaseRequisition[] }>> {
    try {
      const userId = req.user.sub;

      const savedRequisitions =
        await this.purchaseRequisitionService.getSavedPurchaseRequisitions(
          page,
          pageSize,
          userId,
          organisationId,
        );

      return {
        status: "success",
        message: "Saved requisitions fetched successfully.",
        data: { requisitions: savedRequisitions },
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
    @Param("organisationId") organisationId: string,
    @Param("requisitionId") requisitionId: string,
  ) {
    try {
      const requisition =
        await this.purchaseRequisitionService.getPurchaseRequisitionById(
          organisationId,
          requisitionId,
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
