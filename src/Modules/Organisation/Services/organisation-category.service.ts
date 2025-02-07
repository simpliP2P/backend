import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

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

  public async deactivateCategory(
    userId: string,
    categoryId: string,
    organisationId: string,
  ): Promise<void> {
    const updateResult = await this.categoryRepo
      .createQueryBuilder()
      .update(OrganisationCategory)
      .set({ deactivated_at: new Date() })
      .where("id = :categoryId AND organisation_id = :organisationId", {
        categoryId,
        organisationId,
      })
      .returning("id, name")
      .execute();

    console.log("results", updateResult.raw[0]);

    if (updateResult.affected && updateResult.affected > 0) {
      const user = await this.userService.findAccount({ where: { id: userId } });

      this.auditLogService.logUpdate(
        "organisation_categories",
        updateResult.raw[0].id,
        `${user?.email} deactivated ${updateResult.raw[0].name} category`,
        { deactivated_at: new Date() },
      );
    }
  }

  public async reactivateCategory(
    userId: string,
    organisationId: string,
  ): Promise<void> {
    const updateResult = await this.categoryRepo
      .createQueryBuilder()
      .update(OrganisationCategory)
      .set({ deactivated_at: null })
      .where("organisation_id = :organisationId", {
        organisationId,
      })
      .returning(
        `
          id, name, user_id, organisation_id, deactivated_at,
          (SELECT json_build_object('id', u.id, 'name', CONCAT(u.first_name, ' ', u.last_name), 'email', u.email)
          FROM users u
          WHERE u.id = ${userId}) AS user
        `,
      )
      .execute();

    if (updateResult.affected && updateResult.affected > 0) {
      await this.auditLogService.logUpdate(
        "organisation_categories",
        updateResult.raw[0].id,
        `${updateResult.raw[0].user_id.email} reactivated ${updateResult.raw[0].name} category`,
        { deactivated_at: new Date() },
      );
    }
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
      where: { organisation: { id: organisationId } },
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
}
