import { Module } from "@nestjs/common";
import { OrganisationCategoryService } from "../Services/organisation-category.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrganisationCategory } from "../Entities/organisation-category.entity";
import { AuditLogsModule } from "src/Modules/AuditLogs/Modules/audit-logs.module";
import { UserModule } from "src/Modules/User/Modules/user.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganisationCategory]),
    AuditLogsModule,
    UserModule,
  ],
  controllers: [],
  providers: [OrganisationCategoryService],
  exports: [OrganisationCategoryService],
})
export class OrganisationCategoryModule {}
