import { BaseEntity } from "src/Common/entities/base.entity";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import { PurchaseOrder } from "src/Modules/PurchaseOrder/Entities/purchase-order.entity";
import { User } from "src/Modules/User/Entities/user.entity";
import { Column, Entity, ManyToOne, OneToMany, JoinColumn } from "typeorm";
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

  @ManyToOne(() => OrganisationDepartment, { onDelete: "SET NULL" })
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
    type: "enum",
    enum: PurchaseRequisitionStatus,
    default: PurchaseRequisitionStatus.PENDING,
  })
  status: PurchaseRequisitionStatus;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
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

  @ManyToOne(() => Budget, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "budget_id" })
  budget: Budget;

  @ManyToOne(() => Supplier, (supplier) => supplier.purchaseOrders, {
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "supplier_id" })
  supplier: Supplier;

  @ManyToOne(() => Organisation, (org) => org.purchaseRequisitions, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "organisation_id" })
  organisation: Organisation;

  @ManyToOne(() => OrganisationBranch, { onDelete: "SET NULL" })
  @JoinColumn({ name: "branch_id" })
  branch: OrganisationBranch;

  @ManyToOne(() => User, (user) => user.purchaseRequisitions, {
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "created_by" })
  created_by: User;

  @OneToMany(() => PurchaseOrder, (po) => po.purchase_requisition)
  purchaseOrders: PurchaseOrder[];
}
