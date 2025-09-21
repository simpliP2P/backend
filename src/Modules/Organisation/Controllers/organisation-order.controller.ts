import {
  Body,
  Controller,
  ForbiddenException,
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
import { PurchaseOrderService } from "src/Modules/PurchaseOrder/Services/purchase-order.service";
import { CreatePurchaseOrderDto } from "src/Modules/PurchaseOrder/Dtos/purchase-order.dto";
import { User } from "src/Modules/User/Entities/user.entity";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";
import { PurchaseOrderStatus } from "src/Modules/PurchaseOrder/Enums/purchase-order.enum";

@Controller("organisations")
export class OrganisationOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  /**
   * Purchase Order routes
   */
  @Post(":organisationId/orders")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_ORDERS,
    PermissionType.CREATE_PURCHASE_ORDERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async createOrder(
    @Param("organisationId") organisationId: string,
    @Body() data: CreatePurchaseOrderDto,
    @Req() req: Request,
  ) {
    try {
      const userId = req.user.sub;

      if (!userId) return;

      const order = await this.purchaseOrderService.create(organisationId, {
        ...data,
        created_by: { id: userId } as User,
      });

      return {
        status: "success",
        message: "Purchase order created successfully",
        data: order,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/orders")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_ORDERS,
    PermissionType.GET_PURCHASE_ORDERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getOrders(
    @Param("organisationId") organisationId: string,
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Query("status") status: PurchaseOrderStatus,
  ) {
    try {
      const orders = await this.purchaseOrderService.getOrganisationOrders({
        organisationId,
        page,
        pageSize,
        startDate,
        endDate,
        status,
      });

      return {
        status: "success",
        message: "Orders fetched successfully",
        data: orders,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":organisationId/orders/:orderId")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_ORDERS,
    PermissionType.GET_PURCHASE_ORDERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async getOrderById(
    @Param("organisationId") organisationId: string,
    @Param("orderId") orderId: string,
  ) {
    try {
      const order = await this.purchaseOrderService.getOrganisationOrderById(
        organisationId,
        orderId,
      );

      return {
        status: "success",
        message: "Order fetched successfully",
        data: { order },
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch(":organisationId/orders/:orderId/status")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_PURCHASE_ORDERS,
    PermissionType.UPDATE_PURCHASE_ORDERS,
    PermissionType.APPROVE_PURCHASE_ORDERS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async updateOrderStatus(
    @Req() req: Request,
    @Param("organisationId") organisationId: string,
    @Param("orderId") orderId: string,
    @Body()
    data: {
      status: PurchaseOrderStatus;
      delivery_fee: number;
      vat_percent: number;
    },
  ) {
    try {
      const { status } = data;
      const permissions = req.user.permissions as string[];

      if (
        status &&
        !permissions.includes(PermissionType.OWNER) &&
        !permissions.includes(PermissionType.APPROVE_PURCHASE_ORDERS)
      ) {
        throw new ForbiddenException(
          "You do not have permission to update this order status",
        );
      }

      if (
        !Object.values(PurchaseOrderStatus).includes(status) ||
        status === PurchaseOrderStatus.PENDING
      ) {
        throw new BadRequestException("Invalid status");
      }

      const order = await this.purchaseOrderService.updateOrderStatus(
        organisationId,
        orderId,
        data,
      );

      return {
        status: "success",
        message: "Order status updated successfully",
        data: order,
      };
    } catch (error) {
      throw error;
    }
  }
}
