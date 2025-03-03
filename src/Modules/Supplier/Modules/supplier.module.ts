import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
// import { SuppliersController } from "../Controllers/supplier.controller";
import { SuppliersService } from "../Services/supplier.service";
import { Supplier } from "../Entities/supplier.entity";
import { UserOrganisationRepository } from "src/Modules/Organisation/Repositories/user-organisation.repository";
import { HashHelper } from "src/Shared/Helpers/hash.helper";

@Module({
  imports: [TypeOrmModule.forFeature([Supplier])],
  controllers: [],
  providers: [SuppliersService, UserOrganisationRepository, HashHelper],
  exports: [SuppliersService],
})
export class SuppliersModule {}
