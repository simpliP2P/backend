import {
  Controller,
  Post,
  Body,
  Req,
  SetMetadata,
  UseGuards,
  Put,
} from "@nestjs/common";
import { PurchaseRequisitionService } from "../Services/purchase-requisition.service";
import { Request } from "express";
import {
  InitializePurchaseRequisitionDto,
  CreatePurchaseRequisitionDto,
} from "../Dtos/purchase-requisition.dto";
import { PermissionType } from "src/Modules/Organisation/Enums/user-organisation.enum";
import { OrganisationPermissionsGuard } from "src/Guards/permissions.guard";

@Controller("purchase-requisitions")
@UseGuards(OrganisationPermissionsGuard)
export class PurchaseRequisitionController {
  constructor(
    private readonly purchaseRequisitionService: PurchaseRequisitionService,
  ) {}

  @Post("initialize")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
  ])
  async initializePurchaseRequisition(
    @Req() req: Request,
    @Body() data: InitializePurchaseRequisitionDto,
  ) {
    try {
      const userId = req.user.sub;

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

  @Put("finalize")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
  ])
  async finalizePurchaseRequisition(
    @Req() req: Request,
    @Body() data: CreatePurchaseRequisitionDto,
  ) {
    try {
      const userId = req.user.sub;
      const organisationId = req.headers.oid as string;

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
