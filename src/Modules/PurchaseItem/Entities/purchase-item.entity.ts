import { IsEnum } from "class-validator";
import { BaseEntity } from "src/Common/entities/base.entity";
import { Product } from "src/Modules/Product/Entities/product.entity";
import { PurchaseOrder } from "src/Modules/PurchaseOrder/Entities/purchase-order.entity";
import { PurchaseRequisition } from "src/Modules/PurchaseRequisition/Entities/purchase-requisition.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { PurchaseItemStatus } from "../Enums/purchase-item.enum";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";

@Entity("purchase_items")
export class PurchaseItem extends BaseEntity {
  @ManyToOne(() => PurchaseRequisition, (pr) => pr.items, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "purchase_requisition_id" })
  purchase_requisition: PurchaseRequisition;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { nullable: true })
  @JoinColumn({ name: "purchase_order_id" })
  purchase_order: PurchaseOrder;

  @ManyToOne(() => Product, { nullable: true }) // Nullable for non-inventory items
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "varchar" }) // For items not in inventory
  item_name: string;

  @Column({ type: "decimal", precision: 10, scale: 2 }) // For items not in inventory
  unit_price: number;

  @Column({ default: "USD" })
  currency: string;

  @Column({ type: "varchar", nullable: true }) // For items not in inventory
  image_url: string | null;

  @Column({ type: "int", default: 0 }) // PR quantity
  pr_quantity: number;

  @Column({ type: "int", nullable: true }) // PO quantity (nullable in PR stage)
  po_quantity: number;

  @IsEnum(PurchaseItemStatus)
  @Column({ type: "varchar", default: PurchaseItemStatus.PENDING })
  status: PurchaseItemStatus;

  @ManyToOne(() => Organisation, (org) => org.purchaseRequisitions)
  @JoinColumn({ name: "organisation_id" })
  organisation: Organisation;
}
