import { Module } from "@nestjs/common";
import { PurchaseOrderService } from "../Services/purchase-order.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PurchaseOrder } from "../Entities/purchase-order.entity";
import { SuppliersModule } from "src/Modules/Supplier/Modules/supplier.module";
import { OrganisationModule } from "src/Modules/Organisation/Modules/organisation.module";
import { PurchaseItem } from "src/Modules/PurchaseItem/Entities/purchase-item.entity";
import { BudgetModule } from "src/Modules/Budget/Modules/budget.module";
import { MailModule } from "src/Modules/Mail/mail.module";
import { HashHelper } from "src/Shared/Helpers/hash.helper";
import { NotificationsModule } from "src/Modules/Notifications/notifications.module";
import { TokenModule } from "src/Modules/Token/token.module";
import { PurchaseOrderController } from "../Controllers/purchase-order.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseOrder, PurchaseItem]),
    SuppliersModule,
    OrganisationModule,
    BudgetModule,
    MailModule,
    TokenModule,
    NotificationsModule,
  ],
  providers: [PurchaseOrderService, HashHelper],
  controllers: [PurchaseOrderController],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
