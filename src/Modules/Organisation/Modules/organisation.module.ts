import { Module } from "@nestjs/common";
import { OrganisationService } from "../Services/organisation.service";
import { OrganisationController } from "../Controllers/organisation.controller";
import { Organisation } from "../Entities/organisation.entity";
import { UserOrganisation } from "../Entities/user-organisation.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserModule } from "src/Modules/User/Modules/user.module";
import { ClientHelper } from "src/Shared/Helpers/client.helper";
import { TokenModule } from "src/Modules/Token/token.module";
import { MailModule } from "src/Modules/Mail/mail.module";
import { UserOrganisationRepository } from "../Repositories/user-organisation.repository";
import { AppLogger } from "src/Logger/logger.service";
import { SuppliersModule } from "src/Modules/Supplier/Modules/supplier.module";
import { PurchaseRequisitionService } from "src/Modules/PurchaseRequisition/Services/purchase-requisition.service";
import { PurchaseRequisition } from "src/Modules/PurchaseRequisition/Entities/purchase-requisition.entity";
import { ProductModule } from "src/Modules/Product/Modules/product.module";
import { UploadModule } from "src/Modules/Upload/upload.module";
import { AuditLogsModule } from "src/Modules/AuditLogs/Modules/audit-logs.module";
import { OrganisationDepartmentService } from "../Services/organisation-department.service";
import { OrganisationBranchService } from "../Services/organisation-branch.service";
import { OrganisationBranch } from "../Entities/organisation-branch.entity";
import { OrganisationDepartment } from "../Entities/organisation-department.entity";
import { User } from "src/Modules/User/Entities/user.entity";
import { PurchaseItemService } from "src/Modules/PurchaseItem/Services/purchase-item.service";
import { PurchaseItemModule } from "src/Modules/PurchaseItem/Modules/purchase-item.module";
// import { PurchaseOrderModule } from "src/Modules/PurchaseOrder/Modules/purchaseOrder.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Organisation,
      OrganisationDepartment,
      OrganisationBranch,
      UserOrganisation,
      PurchaseRequisition,
    ]),
    UserModule,
    TokenModule,
    MailModule,
    SuppliersModule,
    ProductModule,
    UploadModule,
    AuditLogsModule,
    PurchaseItemModule,
    // PurchaseOrderModule
  ],
  controllers: [OrganisationController],
  providers: [
    OrganisationService,
    OrganisationDepartmentService,
    OrganisationBranchService,
    ClientHelper,
    UserOrganisationRepository,
    AppLogger,
    PurchaseRequisitionService,
  ],
  exports: [OrganisationService],
})
export class OrganisationModule {}
