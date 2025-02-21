import { Module } from "@nestjs/common";
import { PurchaseOrderService } from "../Services/purchase-order.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PurchaseOrder } from "../Entities/purchase-order.entity";
import { SuppliersModule } from "src/Modules/Supplier/Modules/supplier.module";
import { OrganisationModule } from "src/Modules/Organisation/Modules/organisation.module";
import { PurchaseItem } from "src/Modules/PurchaseItem/Entities/purchase-item.entity";
import { PurchaseRequisitionModule } from "src/Modules/PurchaseRequisition/Modules/purchase-requisition.module";
import { BudgetModule } from "src/Modules/Budget/Modules/budget.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseOrder, PurchaseItem]),
    SuppliersModule,
    OrganisationModule,
    PurchaseRequisitionModule,
    BudgetModule,
  ],
  controllers: [],
  providers: [PurchaseOrderService],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
