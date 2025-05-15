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
    const foundItem = await this.purchaseItemRepo.findOne({
      where: {
        product: { id: data.product_id },
        item_name: data.item_name,
        organisation: { id: organisationId },
        purchase_requisition: { id: data.pr_id, pr_number: data.pr_number },
      },
    });

    if (foundItem)
      throw new NotFoundException(`Item already exists in the purchase list.`);

    // Create the new purchase item
    const newItem = this.purchaseItemRepo.create({
      ...data,
      pr_quantity: data.pr_quantity,
      purchase_requisition: { id: data.pr_id, pr_number: data.pr_number },
      product: { id: data.product_id },
      purchase_order: { id: data.purchase_order_id },
      organisation: { id: organisationId },
    });

    // The subscriber will automatically update the PR quanity & estimated cost
    return await this.purchaseItemRepo.save(newItem);
  }

  async getAllPurchaseItems(
    query: any,
    page: number,
    pageSize: number,
  ): Promise<{ data: PurchaseItem[]; metadata: any }> {
    let _page = page;
    let _pageSize = pageSize;
    if (isNaN(page) || page < 1) _page = 1;
    if (isNaN(pageSize) || pageSize < 1) _pageSize = 10;

    const skip = (_page - 1) * _pageSize; // Calculate the offset

    const [data, total] = await this.purchaseItemRepo.findAndCount({
      where: query,
      relations: ["purchase_requisition", "purchase_order", "product"],
      select: {
        purchase_requisition: {
          id: true,
          pr_number: true,
        },
        purchase_order: {
          id: true,
        },
        product: {
          id: true,
        },
      },
      take: _pageSize,
      skip,
    });

    return {
      data,
      metadata: {
        total,
        page: _page,
        pageSize: _pageSize,
        totalPages: Math.ceil(total / _pageSize),
      },
    };
  }

  async getPurchaseItemById(
    organisationId: string,
    itemId: string,
  ): Promise<PurchaseItem> {
    const item = await this.purchaseItemRepo.findOne({
      where: { id: itemId, organisation: { id: organisationId } },
      relations: ["purchase_requisition", "purchase_order", "product"],
      select: {
        purchase_requisition: {
          id: true,
          pr_number: true,
        },
        purchase_order: {
          id: true,
        },
        product: {
          id: true,
        },
      },
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

    // The subscriber will handle updating the PR totals
    return await this.purchaseItemRepo.save(item);
  }

  async deletePurchaseItem(organisationId: string, id: string): Promise<void> {
    // Find the item first with the PR relation so we have its data for the subscriber
    const item = await this.purchaseItemRepo.findOne({
      where: {
        id,
        organisation: { id: organisationId },
      },
      relations: ["purchase_requisition"],
    });

    if (!item) {
      throw new NotFoundException(`Purchase item with ID ${id} not found.`);
    }

    // Remove the item - the subscriber will update the PR totals
    await this.purchaseItemRepo.remove(item);
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
