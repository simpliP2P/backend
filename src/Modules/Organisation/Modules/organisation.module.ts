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

@Module({
  imports: [
    TypeOrmModule.forFeature([Organisation, UserOrganisation]),
    UserModule,
    TokenModule,
    MailModule,
  ],
  controllers: [OrganisationController],
  providers: [OrganisationService, ClientHelper, UserOrganisationRepository, AppLogger],
  exports: [OrganisationService],
})
export class OrganisationModule {}
