import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from "@nestjs/common";
import { PurchaseItemService } from "../Services/purchase-item.service";
import {
  PurchaseItemDto,
  UpdatePurchaseItemDto,
} from "../Dtos/purchase-item.dto";

@Controller("purchase-items")
export class PurchaseItemController {
  constructor(private readonly purchaseItemService: PurchaseItemService) {}

  @Post()
  async addItem(@Body() data: PurchaseItemDto) {
    return await this.purchaseItemService.createPurchaseItem(data);
  }

  @Put(":id")
  async updateItem(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() data: UpdatePurchaseItemDto,
  ) {
    return await this.purchaseItemService.updatePurchaseItem(id, data);
  }

  @Delete(":id")
  async deleteItem(@Param("id", new ParseUUIDPipe()) id: string) {
    return await this.purchaseItemService.deletePurchaseItem(id);
  }
}
