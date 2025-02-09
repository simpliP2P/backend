import {
  Controller,
  Post,
  Body,
  Req,
  SetMetadata,
  UseGuards,
} from "@nestjs/common";
import { PurchaseRequisitionService } from "../Services/purchase-requisition.service";
import { Request } from "express";
import { InitializePurchaseRequisitionDto } from "../Dtos/purchase-requisition.dto";
import { PermissionType } from "src/Modules/Organisation/Enums/user-organisation.enum";
import { OrganisationPermissionsGuard } from "src/Guards/permissions.guard";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";
import { CreatePurchaseRequisitionDto } from "src/Modules/Organisation/Dtos/organisation.dto";

@Controller("purchase-requisitions")
export class PurchaseRequisitionController {
  constructor(
    private readonly purchaseRequisitionService: PurchaseRequisitionService,
  ) {}

  @Post("initialize")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async initializePurchaseRequisition(
    @Req() req: Request,
    @Body() data: InitializePurchaseRequisitionDto,
  ) {
    try {
      const userId = req.user.sub;

      const unCompletedRequisition =
        await this.purchaseRequisitionService.checkForUnCompletedRequisition(
          userId,
        );

      if (unCompletedRequisition) {
        throw new BadRequestException(
          "You already have an incomplete purchase requisition. Please finalize it before starting a new one.",
        );
      }

      const prData =
        await this.purchaseRequisitionService.initializePurchaseRequisition(
          userId,
          data,
        );

      return {
        status: "success",
        message: "Initialized a new purchase requisition",
        data: prData,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post("finalize")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async finalizePurchaseRequisition(
    @Req() req: Request,
    @Body() data: CreatePurchaseRequisitionDto,
  ) {
    try {
      const userId = req.user.sub;
      const organisationId = req.headers.Oid as string;

      if (!organisationId) {
        throw new BadRequestException("Organisation ID is required.");
      }

      const requisition =
        await this.purchaseRequisitionService.finalizePurchaseRequisition(
          organisationId,
          userId,
          data.pr_number,
          data,
        );

      return {
        status: "success",
        message: "Purchase requisition finalized",
        data: { requisition },
      };
    } catch (error) {
      throw error;
    }
  }
}
