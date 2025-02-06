import { BaseEntity } from "src/Common/entities/base.entity";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import { PurchaseOrder } from "src/Modules/PurchaseOrder/Entities/purchase-order.entity";
import { User } from "src/Modules/User/Entities/user.entity"; // Import User entity
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
} from "typeorm";
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
} from "class-validator";
import { PurchaseRequisitionStatus } from "../Enums/purchase-requisition.enum";
import { PurchaseItem } from "src/Modules/PurchaseItem/Entities/purchase-item.entity";

@Entity("purchase_requisitions")
export class PurchaseRequisition extends BaseEntity {
  @IsNotEmpty()
  @IsString()
  @Column()
  prNumber: string;

  @IsNotEmpty()
  @IsString()
  @Column()
  department: string;

  @IsNotEmpty()
  @IsString()
  @Column()
  contact_info: string;

  @IsNotEmpty()
  @IsString()
  @Column()
  requestor_name: string;

  @IsNotEmpty()
  @IsString()
  @Column()
  request_description: string;

  @IsNotEmpty()
  @IsNumber()
  @Column()
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Column()
  estimated_cost: number;

  @IsNotEmpty()
  @IsString()
  @Column()
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

  @Column({ type: "date" })
  needed_by_date: Date;

  @OneToMany(() => PurchaseItem, (item) => item.purchase_requisition)
  items: PurchaseItem[];

  @IsString()
  @Column({ default: "NGN" })
  currency: string;

  @ManyToOne(() => Organisation, (org) => org.purchaseRequisitions)
  @JoinColumn({ name: "organisation_id" }) // Explicit foreign key
  organisation: Organisation;

  @ManyToOne(() => User, (user) => user.purchaseRequisitions)
  @JoinColumn({ name: "created_by" }) // Reference to the User who created the PR
  created_by: User;

  @OneToMany(() => PurchaseOrder, (po) => po.purchase_requisition)
  purchaseOrders: PurchaseOrder[];
}
