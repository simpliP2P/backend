import { Column, Entity, ManyToOne } from "typeorm";
import { PurchaseOrder } from "../../PurchaseOrder/Entities/purchase-order.entity";
import { Product } from "src/Modules/Product/Entities/product.entity";
import { BaseEntity } from "src/Common/entities/base.entity";

@Entity("purchase_order_items")
export class PurchaseOrderItem extends BaseEntity {
  @Column("decimal", { precision: 10, scale: 2 })
  quantity: number;

  @Column("decimal", { precision: 10, scale: 2 })
  unitPrice: number;

  @ManyToOne(() => PurchaseOrder, (po) => po.items)
  purchaseOrder: PurchaseOrder;

  @ManyToOne(() => Product, (product) => product.purchaseOrderItems)
  product: Product;
}
