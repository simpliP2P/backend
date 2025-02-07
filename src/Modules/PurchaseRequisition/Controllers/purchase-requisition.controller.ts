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
      
      const prNumber =
      await this.purchaseRequisitionService.initializePurchaseRequisition(
        userId,
        data,
      );
      
      return {
        status: "success",
        message: "Initialized a new purchase requisition",
        data: { prNumber },
      };
    } catch (error) {
      throw error
    }
  }
}
