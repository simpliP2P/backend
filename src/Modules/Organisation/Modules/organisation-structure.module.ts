import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrganisationBranch } from "../Entities/organisation-branch.entity";
import { OrganisationDepartment } from "../Entities/organisation-department.entity";
import { OrganisationBranchService } from "../Services/organisation-branch.service";
import { OrganisationDepartmentService } from "../Services/organisation-department.service";
import { User } from "src/Modules/User/Entities/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganisationBranch,
      OrganisationDepartment,
      User,
    ]),
  ],
  providers: [OrganisationBranchService, OrganisationDepartmentService],
  exports: [OrganisationBranchService, OrganisationDepartmentService],
})
export class OrganisationStructureModule {}
