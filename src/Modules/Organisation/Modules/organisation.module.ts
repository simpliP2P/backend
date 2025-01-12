import { Module } from "@nestjs/common";
import { OrganisationService } from "../Services/organisation.service";
import { OrganisationController } from "../Controllers/organisation.controller";
import { Organisation, UserOrganisation } from "../Entities/organisation.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserModule } from "src/Modules/User/Modules/user.module";
import { UserService } from "src/Modules/User/Services/user.service";

@Module({
  imports: [TypeOrmModule.forFeature([Organisation, UserOrganisation]), UserModule],
  controllers: [OrganisationController],
  providers: [OrganisationService],
  exports: [OrganisationService]
})
export class OrganisationModule {}
