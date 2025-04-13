import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Req,
  UseGuards,
} from "@nestjs/common";
import { PurchaseOrderService } from "../Services/purchase-order.service";
import { ResourceGuard } from "src/Guards/resource.guard";
import { Public } from "src/Shared/Decorators/custom.decorator";

@Controller("purchase-orders")
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  /**
   * For suppliers to view purchase-order
   */
  @Get(":id")
  @Public()
  @UseGuards(ResourceGuard)
  async viewPurchaseOrder(
    @Param("id") purchaseOrderId: string,
    @Req() req: any,
  ) {
    const { meta_data } = req.resourceData;
    const { organisationId, poId } = meta_data;

    if (purchaseOrderId !== poId) {
      throw new ForbiddenException("Access to resource denied!");
    }

    const { purchase_requisition, ...purchaseOrder } =
      await this.purchaseOrderService.getOrganisationOrderById(
        organisationId,
        poId,
      );

    return purchaseOrder;
  }
}
