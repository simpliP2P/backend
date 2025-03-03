import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import { IsEmail, IsEnum } from "class-validator";
import { PurchaseOrder } from "src/Modules/PurchaseOrder/Entities/purchase-order.entity";
import { BaseEntity } from "src/Common/entities/base.entity";
import { BankDetails, SupplierMetadata } from "../Types/supplier.types";
import { OrganisationCategory } from "src/Modules/Organisation/Entities/organisation-category.entity";
import { Address } from "src/Shared/Interfaces/address.interface";
import { PaymentTerms } from "../Enums/supplier.enum";

@Entity("suppliers")
export class Supplier extends BaseEntity {
  @Column({ type: "varchar" })
  full_name: string;

  @IsEmail()
  @Column({ type: "varchar", nullable: true, unique: true })
  email: string;

  @Column({ type: "varchar", nullable: true, unique: true })
  phone: string;

  @Column({ type: "jsonb", nullable: true })
  address: Address;

  @ManyToOne(() => OrganisationCategory)
  @JoinColumn({ name: "category_id" })
  category: OrganisationCategory;

  @Column({ type: "decimal", precision: 2, scale: 1, default: 0.0 })
  rating: number;

  @Column({ type: "jsonb", nullable: true })
  bank_details: BankDetails;

  @Column({ type: "jsonb", nullable: true })
  meta_data: SupplierMetadata;

  @IsEnum(PaymentTerms)
  @Column({ type: "varchar", nullable: true })
  payment_term: PaymentTerms;

  @Column({ type: "varchar", nullable: true })
  lead_time: string;

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
