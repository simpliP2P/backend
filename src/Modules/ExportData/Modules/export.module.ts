import { TypeOrmModule } from "@nestjs/typeorm";
import { UserOrganisation } from "src/Modules/Organisation/Entities/user-organisation.entity";
import { ExportService } from "../Services/export.service";
import { ExportController } from "../Controllers/export.controller";
import { Module } from "@nestjs/common";
import { ExportHelper } from "src/Shared/Helpers/export.helper";
import { FileManagerModule } from "src/Modules/FileManager/Modules/file-manager.module";
import { ExportWorker } from "../Services/export-worker.service";
import { AuditLogsModule } from "src/Modules/AuditLogs/Modules/audit-logs.module";
import { PurchaseRequisitionModule } from "src/Modules/PurchaseRequisition/Modules/purchase-requisition.module";
import { PurchaseOrderModule } from "src/Modules/PurchaseOrder/Modules/purchase-order.module";
import { OrganisationAccessModule } from "src/Modules/Organisation/Modules/organisation-access.module";
import { SuppliersModule } from "src/Modules/Supplier/Modules/supplier.module";
import { ProductModule } from "src/Modules/Product/Modules/product.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrganisation]),
    OrganisationAccessModule,
    PurchaseRequisitionModule,
    PurchaseOrderModule,
    FileManagerModule,
    AuditLogsModule,
    SuppliersModule,
    ProductModule,
  ],
  providers: [ExportService, ExportHelper, ExportWorker],
  controllers: [ExportController],
  exports: [ExportService],
})
export class ExportModule {}
