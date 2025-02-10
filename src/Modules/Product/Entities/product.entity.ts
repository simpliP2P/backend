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
  @Column()
  name: string;

  @Column()
  description: string;

  @Column("decimal", { precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ name: "stock_qty" })
  stockQty: number;

  @Column({ name: "stock_qty_alert", nullable: true })
  stockQtyAlert: number;

  @ManyToOne(() => OrganisationCategory)
  @JoinColumn({ name: "category_id" })
  category: OrganisationCategory;

  @Column({ unique: true, nullable: true })
  @IsOptional()
  productCode: string;

  @Column({ nullable: true })
  image_url: string;

  @ManyToOne(() => Organisation, (org) => org.products)
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
