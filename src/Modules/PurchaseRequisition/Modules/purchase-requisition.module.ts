import { Module } from "@nestjs/common";
import { PurchaseRequisitionService } from "../Services/purchase-requisition.service";
import { PurchaseItemModule } from "src/Modules/PurchaseItem/Modules/purchase-item.module";
import { PurchaseRequisitionController } from "../Controllers/purchase-requisition.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PurchaseRequisition } from "../Entities/purchase-requisition.entity";
import { OrganisationModule } from "src/Modules/Organisation/Modules/organisation.module";
import { UserOrganisationRepository } from "src/Modules/Organisation/Repositories/user-organisation.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseRequisition]),
    PurchaseItemModule,
    OrganisationModule,
  ],
  controllers: [PurchaseRequisitionController],
  providers: [PurchaseRequisitionService, UserOrganisationRepository],
})
export class PurchaseRequisitionModule {}
