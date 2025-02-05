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
import { PurchaseOrderItem } from "src/Modules/PurchaseOrderItem/Entities/purchase-order-item.entity";
import { IsOptional } from "class-validator";

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

  @Column()
  category: string;

  @Column({ unique: true, nullable: true })
  @IsOptional()
  productCode: string;

  @Column({ nullable: true })
  image_url: string;

  @ManyToOne(() => Organisation, (org) => org.products)
  @JoinColumn({ name: "organisation_id" })
  organisation: Organisation;

  @OneToMany(() => PurchaseOrderItem, (poi) => poi.product)
  purchaseOrderItems: PurchaseOrderItem[];

  @BeforeInsert()
  @BeforeUpdate()
  setDefaultStockQtyAlert() {
    if (!this.stockQtyAlert) {
      this.stockQtyAlert = Math.floor(this.stockQty * 0.2); // 20% of stockQty
    }
  }
}
