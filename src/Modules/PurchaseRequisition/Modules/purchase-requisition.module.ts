import { Module } from "@nestjs/common";
import { PurchaseRequisitionService } from "../Services/purchase-requisition.service";
import { PurchaseItemModule } from "src/Modules/PurchaseItem/Modules/purchase-item.module";
import { PurchaseRequisitionController } from "../Controllers/purchase-requisition.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PurchaseRequisition } from "../Entities/purchase-requisition.entity";
import { OrganisationModule } from "src/Modules/Organisation/Modules/organisation.module";
import { BudgetModule } from "src/Modules/Budget/Modules/budget.module";
import { HashHelper } from "src/Shared/Helpers/hash.helper";

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseRequisition]),
    PurchaseItemModule,
    OrganisationModule,
    BudgetModule,
  ],
  controllers: [PurchaseRequisitionController],
  providers: [PurchaseRequisitionService, HashHelper],
  exports: [PurchaseRequisitionService],
})
export class PurchaseRequisitionModule {}
