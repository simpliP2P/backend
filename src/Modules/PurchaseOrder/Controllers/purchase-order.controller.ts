import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { PurchaseOrderService } from "../Services/purchase-order.service";
import { ResourceGuard } from "src/Guards/resource.guard";

@Controller("purchase-orders")
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  @Get(":id")
  @UseGuards(ResourceGuard)
  async getPurchaseOrders(@Req() req: any) {
    const { meta_data } = req.resourceData;
    const { organisationId, poId } = meta_data;

    const purchaseOrder =
      await this.purchaseOrderService.getOrganisationOrderById(
        organisationId,
        poId,
      );

    return purchaseOrder;
  }
}
