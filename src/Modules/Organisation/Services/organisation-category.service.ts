import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";

import { OrganisationCategory } from "../Entities/organisation-category.entity";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";
import { AuditLogsService } from "src/Modules/AuditLogs/Services/audit-logs.service";
import { UserService } from "src/Modules/User/Services/user.service";

@Injectable()
export class OrganisationCategoryService {
  constructor(
    @InjectRepository(OrganisationCategory)
    private readonly categoryRepo: Repository<OrganisationCategory>,

    private readonly auditLogService: AuditLogsService,
    private readonly userService: UserService,
  ) {}

  public async createCategory(data: { organisationId: string; name: string }) {
    const foundCategory = await this.categoryRepo.findOne({
      where: [
        {
          organisation: { id: data.organisationId },
          name: data.name,
        },
      ],
    });

    if (foundCategory) throw new BadRequestException("Category exists!");

    const category = this.categoryRepo.create({
      name: data.name,
      organisation: { id: data.organisationId },
    });

    const { organisation, deleted_at, updated_at, ...otherDetails } =
      await this.categoryRepo.save(category);

    return otherDetails;
  }

  public async editCategory(
    organisationId: string,
    categoryId: string,
    data: { name: string },
  ) {
    const foundCategory = await this.categoryRepo.findOne({
      where: { id: categoryId, organisation: { id: organisationId } },
    });

    if (!foundCategory) throw new NotFoundException("Category not found");

    foundCategory.name = data.name;
    const updatedCategory = await this.categoryRepo.save(foundCategory);

    return updatedCategory;
  }

  public async getCategoriesByOrganisation(
    organisationId: string,
    page: number,
    pageSize: number,
  ) {
    let _page = page;
    let _pageSize = pageSize;
    if (isNaN(page) || page < 1) _page = 1;
    if (isNaN(pageSize) || pageSize < 1) _pageSize = 10;

    const skip = (_page - 1) * _pageSize; // Calculate the offset

    const [data, total] = await this.categoryRepo.findAndCount({
      where: {
        organisation: { id: organisationId },
      },
      // relations: ["organisation"],
      skip,
      take: _pageSize,
    });

    return {
      categories: data,
      metadata: {
        total,
        page: _page,
        pageSize: _pageSize,
        totalPages: Math.ceil(total / _pageSize),
      },
    };
  }

  public async getCategoryById(organisationId: string, categoryId: string) {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId, organisation: { id: organisationId } },
    });
    if (!category) throw new NotFoundException("Category not found");
    return category;
  }

  public async bulkCreateCategories(
    organisationId: string,
    data: { name: string }[],
    transactionalEntityManager?: EntityManager,
  ) {
    const categories = data.map((category) =>
      this.categoryRepo.create({
        name: category.name,
        organisation: { id: organisationId },
      }),
    );

    const manager = transactionalEntityManager || this.categoryRepo.manager;
    const result = await manager.insert(OrganisationCategory, categories);

    return result.generatedMaps;
  }

  public async deleteCategory(
    userId: string,
    categoryId: string,
    organisationId: string,
  ): Promise<void> {
    const deleteResult = await this.categoryRepo.softDelete({
      id: categoryId,
      organisation: { id: organisationId },
    });

    if (deleteResult.affected && deleteResult.affected > 0) {
      const user = await this.userService.findAccount({
        where: { id: userId },
      });

      await this.auditLogService.logUpdate(
        "organisation_categories",
        categoryId,
        `${user?.email} deleted category with ID ${categoryId}`,
      );
    }
  }
}
