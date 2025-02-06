import { Module } from "@nestjs/common";
import { PurchaseRequisitionService } from "../Services/purchase-requisition.service";
import { PurchaseItemModule } from "src/Modules/PurchaseItem/Modules/purchase-item.module";
// import { PurchaseRequisitionController } from "../Controllers/purchaseRequisition.controller";

@Module({
  imports: [PurchaseItemModule],
  controllers: [],
  providers: [PurchaseRequisitionService],
})
export class PurchaseRequisitionModule {}
