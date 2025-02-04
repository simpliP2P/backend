import { Module } from "@nestjs/common";
import { OrganisationService } from "../Services/organisation.service";
import { OrganisationController } from "../Controllers/organisation.controller";
import {
  Organisation,
  UserOrganisation,
} from "../Entities/organisation.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserModule } from "src/Modules/User/Modules/user.module";
import { ClientHelper } from "src/Shared/Helpers/client.helper";
import { TokenModule } from "src/Modules/Token/token.module";
import { MailModule } from "src/Modules/Mail/mail.module";
import { UserOrganisationRepository } from "../Repositories/userOrganisation.repository";
import { AppLogger } from "src/Logger/logger.service";
import { SuppliersModule } from "src/Modules/Supplier/Modules/supplier.module";
import { PurchaseRequisitionService } from "src/Modules/PurchaseRequisition/Services/purchaseRequisition.service";
import { PurchaseRequisition } from "src/Modules/PurchaseRequisition/Entities/purchaseRequisition.entity";
import { ProductModule } from "src/Modules/Product/Modules/product.module";
import { UploadModule } from "src/Modules/Upload/upload.module";
import { AuditLogsModule } from "src/Modules/AuditLogs/Modules/auditLogs.module";
// import { PurchaseOrderModule } from "src/Modules/PurchaseOrder/Modules/purchaseOrder.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Organisation, UserOrganisation, PurchaseRequisition]),
    UserModule,
    TokenModule,
    MailModule,
    SuppliersModule,
    ProductModule,
    UploadModule,
    AuditLogsModule,
    // PurchaseOrderModule
  ],
  controllers: [OrganisationController],
  providers: [
    OrganisationService,
    ClientHelper,
    UserOrganisationRepository,
    AppLogger,
    PurchaseRequisitionService,
  ],
  exports: [OrganisationService],
})
export class OrganisationModule {}
