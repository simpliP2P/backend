import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,  
} from "typeorm";
import { PurchaseItem } from "../Entities/purchase-item.entity";
import { PurchaseRequisition } from "../../PurchaseRequisition/Entities/purchase-requisition.entity";

@EventSubscriber()
export class PurchaseItemSubscriber
  implements EntitySubscriberInterface<PurchaseItem>
{
  listenTo() {
    return PurchaseItem;
  }

  private tempData: Map<string, any> = new Map();

  private calculateItemCost(purchaseItem: Partial<PurchaseItem>): number {
    return (
      (Number(purchaseItem.pr_quantity) || 0) *
      (Number(purchaseItem.unit_price) || 0)
    );
  }

  /**
   * After a purchase item is inserted, update the parent PR's quantity and estimated cost
   */
  async afterInsert(event: InsertEvent<PurchaseItem>): Promise<void> {
    const purchaseItem = event.entity;

    if (purchaseItem && purchaseItem.purchase_requisition) {
      const prId =
        typeof purchaseItem.purchase_requisition === "object"
          ? purchaseItem.purchase_requisition.id
          : purchaseItem.purchase_requisition;

      const itemQuantity = Number(purchaseItem.pr_quantity) || 0;
      const itemCost = this.calculateItemCost(purchaseItem);

      // Update PR totals (add the new values)
      await event.manager
        .createQueryBuilder()
        .update(PurchaseRequisition)
        .set({
          quantity: () => `quantity + ${itemQuantity}`,
          estimated_cost: () => `estimated_cost + ${itemCost}`,
        })
        .where("id = :id", { id: prId })
        .execute();
    }
  }

  async beforeUpdate(event: UpdateEvent<PurchaseItem>): Promise<void> {
    if (event.entity && event.databaseEntity) {
      // Create a unique key for this update operation
      const key = `${event.databaseEntity.id}_${Date.now()}`;

      // Store the data you need
      this.tempData.set(key, {
        oldQuantity: Number(event.databaseEntity.pr_quantity) || 0,
        oldUnitPrice: Number(event.databaseEntity.unit_price) || 0,
        prId:
          typeof event.databaseEntity.purchase_requisition === "object"
            ? event.databaseEntity.purchase_requisition.id
            : event.databaseEntity.purchase_requisition,
        entityId: event.databaseEntity.id,
      });

      // Store the key on the entity for later retrieval
      (event.entity as any).__tempDataKey = key;
    }
  }

  async afterUpdate(event: UpdateEvent<PurchaseItem>): Promise<void> {
    if (!event.entity) return;

    // Retrieve the key and data
    const key = (event.entity as any).__tempDataKey;
    if (!key) return;

    const data = this.tempData.get(key);
    if (!data) return;

    const { oldQuantity, oldUnitPrice, prId } = data;

    // Only proceed if we have a PR ID
    if (prId) {
      // Calculate old and new costs
      const oldCost = oldQuantity * oldUnitPrice;
      const newCost = this.calculateItemCost(event.entity);

      // Calculate the differences
      const newQuantity = Number(event.entity.pr_quantity) || 0;
      const quantityDiff = newQuantity - oldQuantity;
      const costDiff = newCost - oldCost;

      // Only update if there's a difference
      if (quantityDiff !== 0 || costDiff !== 0) {
        await event.manager
          .createQueryBuilder()
          .update(PurchaseRequisition)
          .set({
            quantity: () => `quantity + ${quantityDiff}`,
            estimated_cost: () => `estimated_cost + ${costDiff}`,
          })
          .where("id = :id", { id: prId })
          .execute();
      }
    }

    // Clean up the temporary data
    this.tempData.delete(key);
  }

  /**
   * Before removing an item, subtract its values from the PR totals
   */
  async beforeRemove(event: RemoveEvent<PurchaseItem>): Promise<void> {
    const purchaseItem = event.entity;

    if (purchaseItem && purchaseItem.purchase_requisition) {
      const prId =
        typeof purchaseItem.purchase_requisition === "object"
          ? purchaseItem.purchase_requisition.id
          : purchaseItem.purchase_requisition;

      const itemQuantity = Number(purchaseItem.pr_quantity) || 0;
      const itemCost = this.calculateItemCost(purchaseItem);

      // Deduct the item's values from PR totals
      await event.manager
        .createQueryBuilder()
        .update(PurchaseRequisition)
        .set({
          quantity: () => `GREATEST(0, quantity - ${itemQuantity})`,
          estimated_cost: () => `GREATEST(0, estimated_cost - ${itemCost})`,
        })
        .where("id = :id", { id: prId })
        .execute();
    }
  }
}
