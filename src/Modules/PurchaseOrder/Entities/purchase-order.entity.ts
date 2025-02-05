import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import { Supplier } from "src/Modules/Supplier/Entities/supplier.entity";
import { Column, Entity, ManyToOne, OneToMany, JoinColumn } from "typeorm";
// import { PurchaseOrderItem } from "../../PurchaseOrderItem/Entities/purchaseOrderItem.entity";
import { PurchaseRequisition } from "../../PurchaseRequisition/Entities/purchase-requisition.entity";
import { BaseEntity } from "src/Common/entities/base.entity";
import { PurchaseOrderItem } from "src/Modules/PurchaseOrderItem/Entities/purchase-order-item.entity";

@Entity("purchase_orders")
export class PurchaseOrder extends BaseEntity {
  @Column()
  po_number: string;

  @Column("decimal", { precision: 10, scale: 2 })
  total_amount: number;

  @Column()
  status: string;

  @ManyToOne(() => Organisation, (org) => org.purchaseOrders)
  @JoinColumn({ name: "organisation_id" }) // Explicit foreign key
  organisation: Organisation;

  @ManyToOne(() => Supplier, (supplier) => supplier.purchaseOrders)
  @JoinColumn({ name: "supplier_id" })
  supplier: Supplier;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder)
  items: PurchaseOrderItem[];

  @ManyToOne(() => PurchaseRequisition, { nullable: true })
  @JoinColumn({ name: "pr_id" })
  purchase_requisition: PurchaseRequisition;
}
