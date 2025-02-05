import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import { IsEmail } from "class-validator";
import { PurchaseOrder } from "src/Modules/PurchaseOrder/Entities/purchase-order.entity";
import { BaseEntity } from "src/Common/entities/base.entity";
import { BankDetails, SupplierMetadata } from "../Types/supplierTypes";

@Entity("suppliers")
export class Supplier extends BaseEntity {
  @Column({ type: "varchar" })
  full_name: string;

  @IsEmail()
  @Column({ type: "varchar", nullable: true, unique: true })
  email: string;

  @Column({ type: "varchar", nullable: true, unique: true })
  phone: string;

  @Column({ type: "varchar", nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  category: string;

  @Column({ type: "decimal", precision: 2, scale: 1, default: 0.0 })
  rating: number;

  @Column({ type: "jsonb", nullable: true })
  bank_details: BankDetails;

  @Column({ type: "jsonb", nullable: true })
  meta_data: SupplierMetadata;

  @ManyToOne(() => Organisation, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "organisation_id" })
  organisation: Organisation;

  @OneToMany(() => PurchaseOrder, (po) => po.supplier)
  purchaseOrders: PurchaseOrder[];

  /*
  // This will be useful when suppliers become users
  @Column({ nullable: true })
  userId?: string; 
  */
}
