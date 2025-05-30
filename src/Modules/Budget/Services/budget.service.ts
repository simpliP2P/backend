import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Budget } from "../Entities/budget.entity";
import { CreateBudgetDto, UpdateBudgetDto } from "../Dtos/budget.dto";
import { OrganisationBranchService } from "src/Modules/Organisation/Services/organisation-branch.service";
import { OrganisationDepartmentService } from "src/Modules/Organisation/Services/organisation-department.service";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";

@Injectable()
export class BudgetService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,

    private readonly branchService: OrganisationBranchService,
    private readonly departmentService: OrganisationDepartmentService,
  ) {}

  // Create a new budget
  async create(createBudgetDto: CreateBudgetDto): Promise<Budget> {
    const { branchId, departmentId, ...budgetData } = createBudgetDto;

    const budget = this.budgetRepository.create({
      ...budgetData,
      amount_allocated: createBudgetDto.amount,
      branch: { id: branchId },
      department: { id: departmentId },
      organisation: { id: createBudgetDto.organisationId },
    });

    return await this.budgetRepository.save(budget);
  }

  // Find all budgets
  async findAll(organisationId: string): Promise<Budget[]> {
    return this.budgetRepository.find({
      where: { organisation: { id: organisationId } },
      relations: ["branch", "department"],
      select: {
        branch: {
          id: true,
          name: true,
        },
        department: {
          id: true,
          name: true,
        },
      },
    });
  }

  // Find a budget by ID
  async findOne(organisationId: string, id: string): Promise<Budget> {
    const budget = await this.budgetRepository.findOne({
      where: { id, organisation: { id: organisationId } },
      relations: ["branch", "department"],
      select: {
        branch: {
          id: true,
          name: true,
        },
        department: {
          id: true,
          name: true,
        },
      },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    return budget;
  }

  // Update a budget
  async update(id: string, updateBudgetDto: UpdateBudgetDto): Promise<Budget> {
    const { branchId, departmentId, organisationId, ...budgetData } =
      updateBudgetDto;

    const budget = await this.budgetRepository.preload({
      id,
      ...budgetData,
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    if (branchId) {
      const branch = await this.branchService.findOne(
        organisationId!,
        branchId,
      );

      budget.branch = branch;
    }

    if (departmentId) {
      const department = await this.departmentService.getDepartmentById(
        organisationId!,
        departmentId,
      );

      budget.department = department;
    }

    return this.budgetRepository.save(budget);
  }

  // Delete a budget
  async remove(organisationId: string, id: string): Promise<void> {
    const budget = await this.budgetRepository.findOne({
      where: { id, organisation: { id: organisationId } },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    await this.budgetRepository.remove(budget);
  }

  async consumeReservedAmount(
    organisationId: string,
    budgetId: string,
    amount: number,
  ): Promise<Budget> {
    const budget = await this.findOne(organisationId, budgetId);
    const amountReserved = Number(budget.amount_reserved);

    if (amountReserved < amount) {
      throw new Error("Insufficient reserved amount");
    }

    budget.amount_reserved = amountReserved - amount;

    return this.budgetRepository.save(budget);
  }

  // Reserve an amount from the budget
  async reserveAmount(
    organisationId: string,
    id: string,
    amount: number,
  ): Promise<Budget> {
    const budget = await this.findOne(organisationId, id);
    const balance = Number(budget.balance);
    const amountReserved = Number(budget.amount_reserved);

    if (balance < amount) {
      throw new BadRequestException("Insufficient balance");
    }

    budget.amount_reserved = amountReserved + amount;
    budget.balance = balance - amount;

    return this.budgetRepository.save(budget);
  }

  // Release a reserved amount back to the budget
  async releaseReservedAmount(
    organisationId: string,
    id: string,
    amount: number,
  ): Promise<Budget> {
    const budget = await this.findOne(organisationId, id);
    const balance = Number(budget.balance);
    const amountReserved = Number(budget.amount_reserved);

    if (budget.amount_reserved < amount) {
      throw new Error("Insufficient reserved amount");
    }

    budget.amount_reserved = amountReserved - amount;
    budget.balance = balance + amount;

    return this.budgetRepository.save(budget);
  }

  // Calculate the available amount in the budget
  async calculateAvailableAmount(
    organisationId: string,
    id: string,
  ): Promise<void> {
    const budget = await this.findOne(organisationId, id);
    const amountRemaining = budget.amount_allocated - budget.amount_reserved;

    budget.balance = amountRemaining;
  }
}
