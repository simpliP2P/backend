import { Module } from "@nestjs/common";
import { OrganisationService } from "../Services/organisation.service";
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
import { AuditLogsModule } from "src/Modules/AuditLogs/Modules/audit-logs.module";
import { OrganisationDepartmentService } from "../Services/organisation-department.service";
import { OrganisationBranchService } from "../Services/organisation-branch.service";
import { OrganisationBranch } from "../Entities/organisation-branch.entity";
import { OrganisationDepartment } from "../Entities/organisation-department.entity";
import { User } from "src/Modules/User/Entities/user.entity";
import { PurchaseItemModule } from "src/Modules/PurchaseItem/Modules/purchase-item.module";
import { PurchaseOrderService } from "src/Modules/PurchaseOrder/Services/purchase-order.service";
import { PurchaseOrder } from "src/Modules/PurchaseOrder/Entities/purchase-order.entity";
import { PurchaseItem } from "src/Modules/PurchaseItem/Entities/purchase-item.entity";
import { OrganisationCategoryModule } from "./organisation-category.module";
import { FileManagerModule } from "src/Modules/FileManager/Modules/file-manager.module";
import { OrganisationDepartmentController } from "../Controllers/organisation-department.controller";
import { OrganisationBranchController } from "../Controllers/organisation-branch.controller";
import { BudgetService } from "src/Modules/Budget/Services/budget.service";
import { Budget } from "src/Modules/Budget/Entities/budget.entity";
import { PdfHelper } from "src/Shared/Helpers/pdf-generator.helper";
import { HashHelper } from "src/Shared/Helpers/hash.helper";
import { NotificationsModule } from "src/Modules/Notifications/notifications.module";
import { SubdomainController } from "../Controllers/subdomain.controller";

import {
  OrganisationCoreController,
  OrganisationCategoryController,
  OrganisationMemberController,
  OrganisationSupplierController,
  OrganisationRequisitionController,
  OrganisationOrderController,
  OrganisationProductController,
} from "../Controllers";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Organisation,
      OrganisationDepartment,
      OrganisationBranch,
      UserOrganisation,
      PurchaseRequisition,
      PurchaseOrder,
      PurchaseItem,
      Budget,
    ]),
    UserModule,
    TokenModule,
    MailModule,
    NotificationsModule,
    SuppliersModule,
    ProductModule,
    FileManagerModule,
    AuditLogsModule,
    PurchaseItemModule,
    OrganisationCategoryModule,
  ],
  controllers: [
    // Separated organisation controllers
    OrganisationCoreController,
    OrganisationCategoryController,
    OrganisationMemberController,
    OrganisationSupplierController,
    OrganisationRequisitionController,
    OrganisationOrderController,
    OrganisationProductController,
    // Other existing controllers
    OrganisationDepartmentController,
    OrganisationBranchController,
    SubdomainController,
  ],
  providers: [
    OrganisationService,
    OrganisationDepartmentService,
    OrganisationBranchService,
    ClientHelper,
    UserOrganisationRepository,
    AppLogger,
    PurchaseOrderService,
    PurchaseRequisitionService,
    BudgetService,
    PdfHelper,
    OrganisationDepartmentService,
    HashHelper,
  ],
  exports: [
    OrganisationService,
    OrganisationDepartmentService,
    OrganisationBranchService,
    UserOrganisationRepository,
    PurchaseOrderService,
    PurchaseRequisitionService,
    FileManagerModule,
    PdfHelper,
    ClientHelper,
    SuppliersModule,
    ProductModule,
  ],
})
export class OrganisationModule {}
