import { TypeOrmModule } from "@nestjs/typeorm";
import { UserOrganisation } from "src/Modules/Organisation/Entities/user-organisation.entity";
import { OrganisationModule } from "src/Modules/Organisation/Modules/organisation.module";
import { ExportService } from "../Services/export.service";
import { ExportController } from "../Controllers/export.controller";
import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ExportHelper } from "src/Shared/Helpers/export.helper";
import { FileManagerModule } from "src/Modules/FileManager/Modules/file-manager.module";
import { PurchaseRequisitionModule } from "src/Modules/PurchaseRequisition/Modules/purchase-requisition.module";
import { PurchaseOrderModule } from "src/Modules/PurchaseOrder/Modules/purchase-order.module";
import { ExportWorker } from "../Services/export-worker.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrganisation]),
    BullModule.registerQueue({
      name: "export-queue",
    }),
    OrganisationModule,
    FileManagerModule,
    PurchaseRequisitionModule,
    PurchaseOrderModule,
  ],
  providers: [ExportService, ExportHelper, ExportWorker],
  controllers: [ExportController],
  exports: [ExportService],
})
export class ExportModule {}
