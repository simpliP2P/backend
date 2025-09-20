import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import { Supplier } from "src/Modules/Supplier/Entities/supplier.entity";
import { Column, Entity, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { PurchaseRequisition } from "../../PurchaseRequisition/Entities/purchase-requisition.entity";
import { BaseEntity } from "src/Common/entities/base.entity";
import { PurchaseItem } from "src/Modules/PurchaseItem/Entities/purchase-item.entity";
import { Comment } from "src/Modules/Comments/Entities/comment.entity";
import { User } from "src/Modules/User/Entities/user.entity";
import { IsEnum } from "class-validator";
import { PurchaseOrderStatus } from "../Enums/purchase-order.enum";

@Entity("purchase_orders")
export class PurchaseOrder extends BaseEntity {
  @Column()
  po_number: string;

  @Column("decimal", { precision: 10, scale: 2 })
  total_amount: number;

  @Column({ default: "NGN" })
  currency: string;

  @IsEnum(PurchaseOrderStatus)
  @Column({ default: PurchaseOrderStatus.PENDING })
  status: string;

  @Column({ nullable: true })
  attachment: string;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
    default: 0,
  })
  delivery_fee: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
    default: 0,
  })
  vat: number;

  @ManyToOne(() => Organisation, (org) => org.purchaseOrders)
  @JoinColumn({ name: "organisation_id" })
  organisation: Organisation;

  @ManyToOne(() => Supplier, (supplier) => supplier.purchaseOrders)
  @JoinColumn({ name: "supplier_id" })
  supplier: Supplier;

  @OneToMany(() => PurchaseItem, (item) => item.purchase_order)
  items: PurchaseItem[];

  @OneToMany(() => Comment, (comment) => comment.entity_id)
  comments: Comment[];

  @ManyToOne(() => User, (user) => user.purchaseRequisitions)
  @JoinColumn({ name: "created_by" })
  created_by: User;

  @ManyToOne(() => PurchaseRequisition, { nullable: true })
  @JoinColumn({ name: "pr_id" })
  purchase_requisition: PurchaseRequisition;
}
