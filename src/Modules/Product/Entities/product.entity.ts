import { IsOptional } from "class-validator";
import { PurchaseOrderItem } from "src/Modules/PurchaseOrderItem/Entities/purchaseOrderItem.entity";
import { BaseEntity } from "src/Common/entities/base.entity";
import { Column, Entity, OneToMany } from "typeorm";

@Entity("products")
export class Product extends BaseEntity {
  @Column()
  name: string;

  @Column()
  description: string;

  @Column("decimal", { precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ unique: true, nullable: true })
  @IsOptional()
  productCode: string;

  @OneToMany(() => PurchaseOrderItem, (poi) => poi.product)
  purchaseOrderItems: PurchaseOrderItem[];
}
