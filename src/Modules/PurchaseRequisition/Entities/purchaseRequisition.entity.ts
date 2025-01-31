import { BaseEntity } from "src/Common/entities/base.entity";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import { PurchaseOrder } from "src/Modules/PurchaseOrder/Entities/purchaseOrder.entity";
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
import { PurchaseRequisitionStatus } from "../Enums/purchaseRequisition.enum";
import { DeliveryTimeline } from "../Types/purchaseRequisition.dto";

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

  @Column({ type: "jsonb" })
  delivery_timeline: DeliveryTimeline;

  @ManyToOne(() => Organisation, (org) => org.purchaseRequisitions)
  @JoinColumn({ name: "organisation_id" }) // Explicit foreign key
  organisation: Organisation;

  @ManyToOne(() => User, (user) => user.purchaseRequisitions)
  @JoinColumn({ name: "created_by" }) // Reference to the User who created the PR
  created_by: User;

  @OneToMany(() => PurchaseOrder, (po) => po.purchase_requisition)
  purchaseOrders: PurchaseOrder[];

  // Automatically generate PR Number before inserting
  @BeforeInsert()
  generatePrNumber() {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
    this.prNumber = `PR-${timestamp}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }
}
