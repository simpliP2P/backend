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
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";

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
    // Raw SQL is used here to avoid the overhead of TypeORM's entity manager
    try {
      const prRows = await this.prRepo.query(
        `SELECT id, estimated_cost, quantity, currency FROM purchase_requisitions WHERE id = $1 AND organisation_id = $2 LIMIT 1`,
        [data.pr_id, organisationId],
      );

      if (!prRows.length) throw new NotFoundException(`PR not found`);
      const pr = prRows[0] as PurchaseRequisition;

      const newItemCost = data.pr_quantity * data.unit_price;
      const prTotalQty = pr.quantity + data.pr_quantity;
      const prTotalCost = pr.estimated_cost + newItemCost;

      const [savedItem] = await this.purchaseItemRepo.query(
        `
        INSERT INTO purchase_items (
          item_name,
          unit_price,
          pr_quantity,
          currency,
          image_url,
          purchase_requisition_id,
          product_id,
          purchase_order_id,
          organisation_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, item_name, unit_price, pr_quantity;
        `,
        [
          data.item_name,
          data.unit_price,
          data.pr_quantity,
          data.currency || "NGN",
          data.image_url,
          data.pr_id,
          data.product_id,
          data.purchase_order_id,
          organisationId,
        ],
      );

      return {
        item: savedItem,
        purchase_requisition: {
          id: pr.id,
          estimated_cost: prTotalCost,
          quantity: prTotalQty,
          currency: pr.currency,
        },
      };
    } catch (error) {
      if (
        error.code === "23505" &&
        error.constraint === "unique_item_per_org_pr"
      ) {
        throw new BadRequestException("Item exist in PR");
      }

      throw error;
    }
  }

  async getAllPurchaseItems(
    query: any,
    page: number,
    pageSize: number,
  ): Promise<{ items: PurchaseItem[]; metadata: any }> {
    let _page = page;
    let _pageSize = pageSize;
    if (isNaN(page) || page < 1) _page = 1;
    if (isNaN(pageSize) || pageSize < 1) _pageSize = 10;

    const skip = (_page - 1) * _pageSize; // Calculate the offset

    const [items, total] = await this.purchaseItemRepo.findAndCount({
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
      items,
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
    try {
      const itemRows = await this.purchaseItemRepo.query(
        `
        SELECT 
          pi.id, pi.pr_quantity, pi.unit_price, 
          pr.id AS pr_id, pr.estimated_cost, pr.quantity 
        FROM purchase_items pi
        INNER JOIN purchase_requisitions pr 
          ON pi.purchase_requisition_id = pr.id
        WHERE pi.id = $1 AND pi.organisation_id = $2
        LIMIT 1
        `,
        [id, organisationId],
      );

      if (!itemRows.length) {
        throw new NotFoundException(`Purchase item not found`);
      }

      const item = itemRows[0];
      const itemTotalPrice = item.pr_quantity * item.unit_price;
      const prTotalQty = item.quantity - item.pr_quantity;
      const prTotalCost = item.estimated_cost - itemTotalPrice;

      await this.purchaseItemRepo.query(
        `DELETE FROM purchase_items WHERE id = $1 AND organisation_id = $2`,
        [id, organisationId],
      );

      return {
        item: {},
        purchase_requisition: {
          id: item.pr_id,
          estimated_cost: prTotalCost,
          quantity: prTotalQty,
        },
      };
    } catch (error) {
      throw error;
    }
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
