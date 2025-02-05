import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  NotFoundException,
} from "@nestjs/common";
import { PurchaseItemService } from "../Services/purchase-item.service";
import {
  CreatePurchaseItemDto,
  UpdatePurchaseItemDto,
} from "../Dtos/purchase-item.dto";

@Controller("purchase-items")
export class PurchaseItemController {
  constructor(private readonly purchaseItemService: PurchaseItemService) {}

  @Post()
  async create(@Body() data: CreatePurchaseItemDto) {
    return await this.purchaseItemService.createPurchaseItem(data);
  }

  @Get()
  async findAll() {
    return await this.purchaseItemService.getAllPurchaseItems();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return await this.purchaseItemService.getPurchaseItemById(id);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() data: UpdatePurchaseItemDto) {
    return await this.purchaseItemService.updatePurchaseItem(id, data);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.purchaseItemService.deletePurchaseItem(id);
    return { message: "Purchase item deleted successfully." };
  }

  @Patch(":id/approve")
  async approve(@Param("id") id: string) {
    return await this.purchaseItemService.approvePurchaseItem(id);
  }

  @Patch(":id/reject")
  async reject(@Param("id") id: string) {
    return await this.purchaseItemService.rejectPurchaseItem(id);
  }
}
