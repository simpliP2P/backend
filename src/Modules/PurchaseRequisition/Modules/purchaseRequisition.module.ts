import { Module } from "@nestjs/common";
import { PurchaseRequisitionService } from "../Services/purchaseRequisition.service";
// import { PurchaseRequisitionController } from "../Controllers/purchaseRequisition.controller";

@Module({
    imports: [],
    controllers: [],
    providers: [PurchaseRequisitionService],
})

export class PurchaseRequisitionModule {}