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
  Get,
  Query,
  BadRequestException,
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
@UseGuards(OrganisationPermissionsGuard)
export class PurchaseItemController {
  constructor(private readonly purchaseItemService: PurchaseItemService) {}

  @Post()
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.MANAGE_PURCHASE_ORDERS,
  ])
  async addItem(@Req() req: Request, @Body() data: PurchaseItemDto) {
    try {
      const organisationId = req.headers["oid"] as string;

      const createdData = await this.purchaseItemService.createPurchaseItem(
        organisationId,
        data,
      );

      return {
        status: "success",
        message: "Item added successfully",
        data: createdData,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get()
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.MANAGE_PURCHASE_ORDERS,
  ])
  async getAllPurchaseItems(
    @Req() req: Request,
    @Query("pr_number") pr_number: string,
    @Query("po_number") po_number: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
  ) {
    try {
      const organisationId = req.headers["oid"] as string;

      if (!pr_number && !po_number) {
        throw new BadRequestException(
          "Either pr_number or po_number must be provided",
        );
      }

      const data = await this.purchaseItemService.getAllPurchaseItems(
        {
          organisation: { id: organisationId },
          purchase_requisition: pr_number
            ? { pr_number: pr_number }
            : undefined,
          purchase_order: po_number ? { po_number: po_number } : undefined,
        },
        page,
        pageSize,
      );

      return {
        status: "success",
        message: "Items fetched successfully",
        data,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":id")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.MANAGE_PURCHASE_ORDERS,
  ])
  async getPurchaseItemById(
    @Req() req: Request,
    @Param("id", new ParseUUIDPipe()) itemId: string,
  ) {
    try {
      const organisationId = req.headers["oid"] as string;

      const item = await this.purchaseItemService.getPurchaseItemById(
        organisationId,
        itemId,
      );

      return {
        status: "success",
        message: "Item fetched successfully",
        data: { item },
      };
    } catch (error) {
      throw error;
    }
  }

  @Put(":id")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.MANAGE_PURCHASE_ORDERS,
  ])
  async updateItem(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @Body() data: UpdatePurchaseItemDto,
  ) {
    try {
      const organisationId = req.headers["oid"] as string;

      const item = await this.purchaseItemService.updatePurchaseItem(
        organisationId,
        id,
        data,
      );

      return {
        status: "success",
        message: "Item updated successfully",
        data: { item },
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(":id")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_REQUISITIONS,
    PermissionType.MANAGE_PURCHASE_ORDERS,
  ])
  async deleteItem(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ) {
    try {
      const organisationId = req.headers["oid"] as string;

      const data = await this.purchaseItemService.deletePurchaseItem(
        organisationId,
        id,
      );

      return {
        status: "success",
        message: "Item deleted successfully",
        data,
      };
    } catch (error) {
      throw error;
    }
  }
}
