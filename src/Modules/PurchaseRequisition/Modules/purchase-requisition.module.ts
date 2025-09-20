import { Module } from "@nestjs/common";
import { PurchaseRequisitionService } from "../Services/purchase-requisition.service";
import { PurchaseItemModule } from "src/Modules/PurchaseItem/Modules/purchase-item.module";
import { PurchaseRequisitionController } from "../Controllers/purchase-requisition.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PurchaseRequisition } from "../Entities/purchase-requisition.entity";
import { BudgetModule } from "src/Modules/Budget/Modules/budget.module";
import { HashHelper } from "src/Shared/Helpers/hash.helper";
import { PurchaseRequisitionQueryService } from "../Services/purchase-requisition-query.service";
import { PurchaseRequisitionApprovalService } from "../Services/purchase-requisition-approval.service";
import { UserOrganisationRepository } from "src/Modules/Organisation/Repositories/user-organisation.repository";
import { OrganisationAccessModule } from "src/Modules/Organisation/Modules/organisation-access.module";
import { PurchaseOrderModule } from "src/Modules/PurchaseOrder/Modules/purchase-order.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseRequisition]),
    PurchaseItemModule,
    BudgetModule,
    OrganisationAccessModule,
    PurchaseOrderModule,
  ],
  controllers: [PurchaseRequisitionController],
  providers: [
    UserOrganisationRepository,
    PurchaseRequisitionApprovalService,
    PurchaseRequisitionQueryService,
    PurchaseRequisitionService,
    HashHelper,
  ],
  exports: [PurchaseRequisitionService],
})
export class PurchaseRequisitionModule {}
