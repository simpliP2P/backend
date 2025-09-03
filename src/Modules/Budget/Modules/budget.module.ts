import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Budget } from "../Entities/budget.entity";
import { BudgetService } from "../Services/budget.service";
import { BudgetController } from "../Controllers/budget.controller";
import { OrganisationStructureModule } from "src/Modules/Organisation/Modules/organisation-structure.module";
import { OrganisationAccessModule } from "src/Modules/Organisation/Modules/organisation-access.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Budget]),
    OrganisationStructureModule,
    OrganisationAccessModule,
  ],
  providers: [BudgetService],
  controllers: [BudgetController],
  exports: [BudgetService],
})
export class BudgetModule {}
