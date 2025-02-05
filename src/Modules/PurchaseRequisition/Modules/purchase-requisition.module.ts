import { Module } from "@nestjs/common";
import { PurchaseRequisitionService } from "../Services/purchase-requisition.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PurchaseItem } from "src/Modules/PurchaseItem/Entities/purchase-item.entity";
import { PurchaseItemModule } from "src/Modules/PurchaseItem/Modules/purchase-item.module";
// import { PurchaseRequisitionController } from "../Controllers/purchaseRequisition.controller";

@Module({
  imports: [PurchaseItemModule],
  controllers: [],
  providers: [PurchaseRequisitionService],
})
export class PurchaseRequisitionModule {}
