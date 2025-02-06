import { Module } from "@nestjs/common";
import { PurchaseOrderService } from "../Services/purchase-order.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PurchaseOrder } from "../Entities/purchase-order.entity";
import { SuppliersModule } from "src/Modules/Supplier/Modules/supplier.module";
import { OrganisationModule } from "src/Modules/Organisation/Modules/organisation.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseOrder]),
    SuppliersModule,
    OrganisationModule,
  ],
  controllers: [],
  providers: [PurchaseOrderService],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
