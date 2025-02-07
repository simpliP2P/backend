import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  SetMetadata,
  UseGuards,
  Req,
} from "@nestjs/common";
import { PurchaseItemService } from "../Services/purchase-item.service";
import {
  PurchaseItemDto,
  UpdatePurchaseItemDto,
} from "../Dtos/purchase-item.dto";
import { OrganisationPermissionsGuard } from "src/Guards/permissions.guard";
import { PermissionType } from "src/Modules/Organisation/Enums/user-organisation.enum";
import { Request } from "express";

@Controller("purchase-items")
export class PurchaseItemController {
  constructor(private readonly purchaseItemService: PurchaseItemService) {}

  @Post()
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.MANAGE_PURCHASE_ORDERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async addItem(@Req() req: Request, @Body() data: PurchaseItemDto) {
    const organisationId = req.headers["oid"] as string;
    return await this.purchaseItemService.createPurchaseItem(
      organisationId,
      data,
    );
  }

  @Put(":id")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.MANAGE_PURCHASE_ORDERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async updateItem(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @Body() data: UpdatePurchaseItemDto,
  ) {
    const organisationId = req.headers["oid"] as string;

    return await this.purchaseItemService.updatePurchaseItem(
      organisationId,
      id,
      data,
    );
  }

  @Delete(":id")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.MANAGE_PURCHASE_ORDERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async deleteItem(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ) {
    const organisationId = req.headers["oid"] as string;

    return await this.purchaseItemService.deletePurchaseItem(
      organisationId,
      id,
    );
  }
}
