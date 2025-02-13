import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Budget } from "../Entities/budget.entity";
import { BudgetService } from "../Services/budget.service";
import { BudgetController } from "../Controllers/budget.controller";
import { OrganisationModule } from "src/Modules/Organisation/Modules/organisation.module";
import { UserOrganisationRepository } from "src/Modules/Organisation/Repositories/user-organisation.repository";

@Module({
  imports: [TypeOrmModule.forFeature([Budget]), OrganisationModule],
  providers: [BudgetService, UserOrganisationRepository],
  controllers: [BudgetController],
  exports: [BudgetService],
})
export class BudgetModule {}
