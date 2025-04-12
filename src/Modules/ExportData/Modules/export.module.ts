import { TypeOrmModule } from "@nestjs/typeorm";
import { UserOrganisation } from "src/Modules/Organisation/Entities/user-organisation.entity";
import { OrganisationModule } from "src/Modules/Organisation/Modules/organisation.module";
import { ExportService } from "../Services/export.service";
import { ExportController } from "../Controllers/export.controller";
import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ExportHelper } from "src/Shared/Helpers/export.helper";
import { FileManagerModule } from "src/Modules/FileManager/Modules/file-manager.module";
import { ExportWorker } from "../Services/export-worker.service";
import { AuditLogsModule } from "src/Modules/AuditLogs/Modules/audit-logs.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrganisation]),
    BullModule.registerQueue({
      name: "export-queue",
    }),
    OrganisationModule, // PR & PO services are exported in org module
    FileManagerModule,
    AuditLogsModule,
  ],
  providers: [ExportService, ExportHelper, ExportWorker],
  controllers: [ExportController],
  exports: [ExportService],
})
export class ExportModule {}
