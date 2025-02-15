import { BaseEntity } from "src/Common/entities/base.entity";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import { PurchaseOrder } from "src/Modules/PurchaseOrder/Entities/purchase-order.entity";
import { User } from "src/Modules/User/Entities/user.entity"; // Import User entity
import { Column, Entity, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
} from "class-validator";
import { PurchaseRequisitionStatus } from "../Enums/purchase-requisition.enum";
import { PurchaseItem } from "src/Modules/PurchaseItem/Entities/purchase-item.entity";
import { OrganisationBranch } from "src/Modules/Organisation/Entities/organisation-branch.entity";
import { OrganisationDepartment } from "src/Modules/Organisation/Entities/organisation-department.entity";

@Entity("purchase_requisitions")
export class PurchaseRequisition extends BaseEntity {
  @IsNotEmpty()
  @IsString()
  @Column()
  pr_number: string;

  @ManyToOne(() => OrganisationDepartment)
  @JoinColumn({ name: "department_id" })
  department: OrganisationDepartment;

  @IsNotEmpty()
  @IsString()
  @Column({ default: "N/A" })
  contact_info: string;

  @IsNotEmpty()
  @IsString()
  @Column({ default: "N/A" })
  requestor_name: string;

  @IsNotEmpty()
  @IsString()
  @Column({ default: "N/A" })
  request_description: string;

  @IsNotEmpty()
  @IsNumber()
  @Column({ default: 0 })
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Column({ default: 0 })
  estimated_cost: number;

  @IsNotEmpty()
  @IsString()
  @Column({ default: "N/A" })
  justification: string;

  @IsEnum(PurchaseRequisitionStatus)
  @Column({ default: PurchaseRequisitionStatus.PENDING })
  status: PurchaseRequisitionStatus;

  @IsOptional()
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "approved_by" })
  approved_by: User;

  @IsOptional()
  @IsString()
  @Column({ nullable: true })
  approval_justification: string;

  @Column({ type: "date", default: null })
  needed_by_date: Date;

  @OneToMany(() => PurchaseItem, (item) => item.purchase_requisition)
  items: PurchaseItem[];

  @IsString()
  @Column({ default: "NGN" })
  currency: string;

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
}
