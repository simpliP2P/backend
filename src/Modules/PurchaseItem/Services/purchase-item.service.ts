import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PurchaseItem } from "../Entities/purchase-item.entity";
import {
  PurchaseItemDto,
  UpdatePurchaseItemDto,
} from "../Dtos/purchase-item.dto";
import { PurchaseItemStatus } from "../Enums/purchase-item.enum";
import { PurchaseRequisition } from "../../PurchaseRequisition/Entities/purchase-requisition.entity";

@Injectable()
export class PurchaseItemService {
  constructor(
    @InjectRepository(PurchaseItem)
    private readonly purchaseItemRepo: Repository<PurchaseItem>,
    @InjectRepository(PurchaseRequisition)
    private readonly prRepo: Repository<PurchaseRequisition>,
  ) {}

  async insertBulkPurchaseItems(items: PurchaseItemDto[]): Promise<void> {
    await this.purchaseItemRepo.insert(items);
  }

  async createPurchaseItem(
    organisationId: string,
    data: PurchaseItemDto,
  ): Promise<{
    item: PurchaseItem;
    purchase_requisition: Partial<PurchaseRequisition>;
  }> {
    const [itemExists, pr] = await Promise.all([
      this.purchaseItemRepo.findOne({
        where: {
          product: { id: data.product_id },
          item_name: data.item_name,
          organisation: { id: organisationId },
          purchase_requisition: { id: data.pr_id },
        },
      }),
      this.prRepo.findOne({
        where: { id: data.pr_id, organisation: { id: organisationId } },
        select: { id: true, estimated_cost: true, quantity: true },
      }),
    ]);

    if (itemExists) throw new NotFoundException(`Item already exists in PR`);
    if (!pr) throw new NotFoundException(`PR not found`);

    const newItemCost = data.pr_quantity * data.unit_price;
    const prTotalQty = pr.quantity + data.pr_quantity;
    const prTotalCost = pr.estimated_cost + newItemCost;

    const newItem = this.purchaseItemRepo.create({
      ...data,
      pr_quantity: data.pr_quantity,
      purchase_requisition: { id: data.pr_id },
      product: { id: data.product_id },
      purchase_order: { id: data.purchase_order_id },
      organisation: { id: organisationId },
    });

    const savedItem = await this.purchaseItemRepo.save(newItem);
    savedItem.purchase_requisition = undefined as any;
    savedItem.purchase_order = undefined as any;
    savedItem.product = undefined as any;

    const purchase_requisition = {
      id: pr.id,
      estimated_cost: prTotalCost,
      quantity: prTotalQty,
    };

    return { item: savedItem, purchase_requisition };
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

  async deletePurchaseItem(
    organisationId: string,
    id: string,
  ): Promise<{ item: {}; purchase_requisition: Partial<PurchaseRequisition> }> {
    // Find the item first with the PR relation so we have its data for the subscriber
    const item = await this.purchaseItemRepo.findOne({
      where: {
        id,
        organisation: { id: organisationId },
      },
      relations: ["purchase_requisition"],
    });

    if (!item) {
      throw new NotFoundException(`puchase item not found`);
    }

    const pr = item.purchase_requisition;
    const itemTotalPrice = item.pr_quantity * item.unit_price;

    const prTotalQty = pr.quantity - item.pr_quantity;
    const prTotalCost = pr.estimated_cost - itemTotalPrice;

    // Remove the item - the subscriber will update the PR totals
    await this.purchaseItemRepo.remove(item);

    return {
      item: {},
      purchase_requisition: {
        id: pr.id,
        estimated_cost: prTotalCost,
        quantity: prTotalQty,
      },
    };
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
