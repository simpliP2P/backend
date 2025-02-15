import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Budget } from "../Entities/budget.entity";
import { BudgetService } from "../Services/budget.service";
import { BudgetController } from "../Controllers/budget.controller";
import { OrganisationModule } from "src/Modules/Organisation/Modules/organisation.module";

@Module({
  imports: [TypeOrmModule.forFeature([Budget]), OrganisationModule],
  providers: [BudgetService],
  controllers: [BudgetController],
  exports: [BudgetService],
})
export class BudgetModule {}
