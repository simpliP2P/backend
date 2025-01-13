import { BaseEntity } from "src/Common/entities/base.entity";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import { PurchaseOrder } from "src/Modules/PurchaseOrder/Entities/purchaseOrder.entity";
import { Column, Entity, ManyToOne, OneToMany, JoinColumn } from "typeorm";

@Entity("purchase_requisitions")
export class PurchaseRequisition extends BaseEntity {
  @Column()
  prNumber: string;

  @Column()
  status: string;

  @ManyToOne(() => Organisation, (org) => org.purchaseRequisitions)
  @JoinColumn({ name: "organisation_id" }) // Explicit foreign key
  organisation: Organisation;

  @OneToMany(() => PurchaseOrder, (po) => po.purchase_requisition)
  purchaseOrders: PurchaseOrder[];
}
