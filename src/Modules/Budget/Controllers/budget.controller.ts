import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Req,
  SetMetadata,
  UseGuards,
} from "@nestjs/common";
import { BudgetService } from "../Services/budget.service";
import { CreateBudgetDto, UpdateBudgetDto } from "../Dtos/budget.dto";
import { Budget } from "../Entities/budget.entity";
import { Request } from "express";
import { PermissionType } from "src/Modules/Organisation/Enums/user-organisation.enum";
import { OrganisationPermissionsGuard } from "src/Guards/permissions.guard";

@Controller("budgets")
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  // Create a new budget
  @Post()
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_BUDGETS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async create(
    @Body() createBudgetDto: CreateBudgetDto,
    @Req() req: Request,
  ): Promise<Budget> {
    const organisationId = req.headers["oid"] as string;

    return this.budgetService.create({ ...createBudgetDto, organisationId });
  }

  // Get all budgets
  @Get()
  async findAll(@Req() req: Request): Promise<Budget[]> {
    const organisationId = req.headers["oid"] as string;
    return this.budgetService.findAll(organisationId);
  }

  // Get a budget by ID
  @Get(":id")
  async findOne(@Param("id") id: string, @Req() req: Request): Promise<Budget> {
    const organisationId = req.headers["oid"] as string;

    return this.budgetService.findOne(organisationId, id);
  }

  // Update a budget
  @Put(":id")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_BUDGETS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async update(
    @Param("id") id: string,
    @Req() req: Request,
    @Body() updateBudgetDto: UpdateBudgetDto,
  ): Promise<Budget> {
    const organisationId = req.headers["oid"] as string;

    return this.budgetService.update(id, {
      ...updateBudgetDto,
      organisationId,
    });
  }

  // Delete a budget
  @Delete(":id")
  @SetMetadata("permissions", [
    PermissionType.OWNER,
    PermissionType.MANAGE_BUDGETS,
  ])
  @UseGuards(OrganisationPermissionsGuard)
  async remove(@Param("id") id: string, @Req() req: Request): Promise<void> {
    const organisationId = req.headers["oid"] as string;

    return this.budgetService.remove(organisationId, id);
  }
}
