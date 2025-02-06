import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PurchaseItem } from "../Entities/purchase-item.entity";
import {
  PurchaseItemDto,
  UpdatePurchaseItemDto,
} from "../Dtos/purchase-item.dto";
import { PurchaseItemStatus } from "../Enums/purchase-item.enum";

@Injectable()
export class PurchaseItemService {
  constructor(
    @InjectRepository(PurchaseItem)
    private readonly purchaseItemRepo: Repository<PurchaseItem>,
  ) {}

  async insertBulkPurchaseItems(items: PurchaseItemDto[]): Promise<void> {
    await this.purchaseItemRepo.insert(items);
  }

  async createPurchaseItem(data: PurchaseItemDto): Promise<PurchaseItem> {
    const newItem = this.purchaseItemRepo.create(data);
    return await this.purchaseItemRepo.save(newItem);
  }

  async getAllPurchaseItems(query: any): Promise<PurchaseItem[]> {
    return await this.purchaseItemRepo.find({
      where: query,
      relations: ["purchase_requisition", "purchase_order", "product"],
    });
  }

  async getPurchaseItemById(id: string): Promise<PurchaseItem> {
    const item = await this.purchaseItemRepo.findOne({
      where: { id },
      relations: ["purchase_requisition", "purchase_order", "product"],
    });
    if (!item)
      throw new NotFoundException(`Purchase item with ID ${id} not found.`);
    return item;
  }

  async updatePurchaseItem(
    id: string,
    data: UpdatePurchaseItemDto,
  ): Promise<PurchaseItem> {
    const item = await this.getPurchaseItemById(id);
    Object.assign(item, data);
    return await this.purchaseItemRepo.save(item);
  }

  async deletePurchaseItem(id: string): Promise<void> {
    const result = await this.purchaseItemRepo.delete(id);
    if (result.affected === 0)
      throw new NotFoundException(`Purchase item with ID ${id} not found.`);
  }

  async approvePurchaseItem(id: string): Promise<PurchaseItem> {
    return await this.updatePurchaseItem(id, {
      status: PurchaseItemStatus.APPROVED,
    });
  }

  async rejectPurchaseItem(id: string): Promise<PurchaseItem> {
    return await this.updatePurchaseItem(id, {
      status: PurchaseItemStatus.REJECTED,
    });
  }
}
