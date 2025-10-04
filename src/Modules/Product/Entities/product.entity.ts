import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import { BaseEntity } from "src/Common/entities/base.entity";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import { IsOptional } from "class-validator";
import { PurchaseItem } from "src/Modules/PurchaseItem/Entities/purchase-item.entity";
import { OrganisationCategory } from "src/Modules/Organisation/Entities/organisation-category.entity";

@Entity("products")
export class Product extends BaseEntity {
  @Column({ nullable: true })
  inv_number: string; // INV-001

  @Column()
  name: string;

  @Column()
  description: string;

  @Column("decimal", { precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ default: "NGN" })
  currency: string;

  @Column({ name: "stock_qty" })
  stockQty: number;

  @Column({ name: "stock_qty_alert", nullable: true })
  stockQtyAlert: number;

  @Column({ name: "unit_of_measure", nullable: true })
  unitOfMeasure: string;

  @ManyToOne(() => OrganisationCategory)
  @JoinColumn({ name: "category_id" })
  category: OrganisationCategory;

  @Column({ name: "product_code", nullable: true })
  @IsOptional()
  productCode: string;

  @Column({ nullable: true })
  image_url: string;

  @ManyToOne(() => Organisation, (org) => org.products, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organisation_id" })
  organisation: Organisation;

  @OneToMany(() => PurchaseItem, (poi) => poi.product)
  purchaseOrderItems: PurchaseItem[];

  @BeforeInsert()
  @BeforeUpdate()
  setDefaultStockQtyAlert() {
    if (!this.stockQtyAlert) {
      this.stockQtyAlert = Math.floor(this.stockQty * 0.2); // 20% of stockQty
    }
  }
}
