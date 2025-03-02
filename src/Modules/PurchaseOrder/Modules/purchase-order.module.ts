import { Module } from "@nestjs/common";
import { PurchaseOrderService } from "../Services/purchase-order.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PurchaseOrder } from "../Entities/purchase-order.entity";
import { SuppliersModule } from "src/Modules/Supplier/Modules/supplier.module";
import { OrganisationModule } from "src/Modules/Organisation/Modules/organisation.module";
import { PurchaseItem } from "src/Modules/PurchaseItem/Entities/purchase-item.entity";
import { BudgetModule } from "src/Modules/Budget/Modules/budget.module";
import { MailModule } from "src/Modules/Mail/mail.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseOrder, PurchaseItem]),
    SuppliersModule,
    OrganisationModule,
    BudgetModule,
    MailModule,
  ],
  providers: [PurchaseOrderService],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
