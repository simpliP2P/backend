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

  async createPurchaseItem(
    organisationId: string,
    data: PurchaseItemDto,
  ): Promise<PurchaseItem> {
    const newItem = this.purchaseItemRepo.create({
      ...data,
      purchase_requisition: { id: data.pr_id },
      product: { id: data.product_id },
      purchase_order: { id: data.purchase_order_id },
      organisation: { id: organisationId },
    });
    return await this.purchaseItemRepo.save(newItem);
  }

  async getAllPurchaseItems(query: any): Promise<PurchaseItem[]> {
    return await this.purchaseItemRepo.find({
      where: query,
      relations: ["purchase_requisition", "purchase_order", "product"],
    });
  }

  async getPurchaseItemById(
    organisationId: string,
    itemId: string,
  ): Promise<PurchaseItem> {
    const item = await this.purchaseItemRepo.findOne({
      where: { id: itemId },
      relations: ["purchase_requisition", "purchase_order", "product"],
    });
    if (!item)
      throw new NotFoundException(`Purchase item with ID ${itemId} not found.`);
    return item;
  }

  async updatePurchaseItem(
    organisationId: string,
    itemId: string,
    data: UpdatePurchaseItemDto,
  ): Promise<PurchaseItem> {
    const item = await this.getPurchaseItemById(organisationId, itemId);
    Object.assign(item, data);
    return await this.purchaseItemRepo.save(item);
  }

  async deletePurchaseItem(organisationId: string, id: string): Promise<void> {
    const result = await this.purchaseItemRepo.delete({
      id,
      organisation: { id: organisationId },
    });
    if (result.affected === 0)
      throw new NotFoundException(`Purchase item with ID ${id} not found.`);
  }

  async approvePurchaseItem(
    organisationId: string,
    id: string,
  ): Promise<PurchaseItem> {
    return await this.updatePurchaseItem(id, organisationId, {
      status: PurchaseItemStatus.APPROVED,
    });
  }

  async rejectPurchaseItem(
    organisationId: string,
    id: string,
  ): Promise<PurchaseItem> {
    return await this.updatePurchaseItem(id, organisationId, {
      status: PurchaseItemStatus.REJECTED,
    });
  }
}
