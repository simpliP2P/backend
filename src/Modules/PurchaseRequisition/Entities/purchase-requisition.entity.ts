import { BaseEntity } from "src/Common/entities/base.entity";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import { PurchaseOrder } from "src/Modules/PurchaseOrder/Entities/purchase-order.entity";
import { User } from "src/Modules/User/Entities/user.entity";
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import { PurchaseRequisitionStatus } from "../Enums/purchase-requisition.enum";
import { PurchaseItem } from "src/Modules/PurchaseItem/Entities/purchase-item.entity";
import { OrganisationBranch } from "src/Modules/Organisation/Entities/organisation-branch.entity";
import { OrganisationDepartment } from "src/Modules/Organisation/Entities/organisation-department.entity";
import { Budget } from "src/Modules/Budget/Entities/budget.entity";
import { Supplier } from "src/Modules/Supplier/Entities/supplier.entity";

@Entity("purchase_requisitions")
export class PurchaseRequisition extends BaseEntity {
  @Column()
  pr_number: string;

  @ManyToOne(() => OrganisationDepartment)
  @JoinColumn({ name: "department_id" })
  department: OrganisationDepartment;

  @Column({ default: "N/A" })
  requestor_phone: string;

  @Column({ default: "N/A" })
  requestor_name: string;

  @Column({ default: "" })
  requestor_email: string;

  @Column({ default: "N/A" })
  request_description: string;

  @Column({ default: 0 })
  quantity: number;

  @Column({ default: 0 })
  total_items: number;

  @Column({ default: 0 })
  estimated_cost: number;

  @Column({ default: "N/A" })
  justification: string;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
    default: 0,
  })
  delivery_fee: number;

  @Column({
    type: "enum",
    enum: PurchaseRequisitionStatus,
    default: PurchaseRequisitionStatus.PENDING,
  })
  status: PurchaseRequisitionStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "approved_by" })
  approved_by: User;

  @Column({ nullable: true })
  approval_justification: string;

  @Column({ type: "date", default: null })
  needed_by_date: Date;

  @OneToMany(() => PurchaseItem, (item) => item.purchase_requisition)
  items: PurchaseItem[];

  @Column({ default: "NGN" })
  currency: string;

  @ManyToOne(() => Budget, { nullable: true })
  @JoinColumn({ name: "budget_id" })
  budget: Budget;

  @ManyToOne(() => Supplier, (supplier) => supplier.purchaseOrders)
  @JoinColumn({ name: "supplier_id" })
  supplier: Supplier;

  @ManyToOne(() => Organisation, (org) => org.purchaseRequisitions)
  @JoinColumn({ name: "organisation_id" })
  organisation: Organisation;

  @ManyToOne(() => OrganisationBranch)
  @JoinColumn({ name: "branch_id" })
  branch: OrganisationBranch;

  @ManyToOne(() => User, (user) => user.purchaseRequisitions)
  @JoinColumn({ name: "created_by" })
  created_by: User;

  @OneToMany(() => PurchaseOrder, (po) => po.purchase_requisition)
  purchaseOrders: PurchaseOrder[];

  /**
   * Calculate total before inserting
   */
  @BeforeInsert()
  calculateTotalOnInsert() {
    this.calculateTotal();
  }

  /**
   * Recalculate total before updating
   */
  @BeforeUpdate()
  calculateTotalOnUpdate() {
    this.calculateTotal();
  }

  /**
   * Calculate total by adding delivery_fee to estimated_cost
   * estimated_cost becomes the total including delivery fee
   */
  private calculateTotal() {
    const baseCost = this.estimated_cost || 0;
    const deliveryFee = this.delivery_fee || 0;
    this.estimated_cost = baseCost + deliveryFee;
  }

  /**
   * Update delivery fee and recalculate total
   */
  updateDeliveryFee(deliveryFee: number) {
    this.delivery_fee = deliveryFee;
    this.calculateTotal();
  }

  /**
   * Update base cost (before delivery fee) and recalculate total
   */
  updateBaseCost(baseCost: number) {
    const deliveryFee = this.delivery_fee || 0;
    this.estimated_cost = baseCost + deliveryFee;
  }
}
