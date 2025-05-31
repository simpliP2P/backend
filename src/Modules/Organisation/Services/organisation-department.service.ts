import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, EntityNotFoundError, Repository } from "typeorm";
import { User } from "src/Modules/User/Entities/user.entity";
import { OrganisationDepartment } from "../Entities/organisation-department.entity";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";

@Injectable()
export class OrganisationDepartmentService {
  constructor(
    @InjectRepository(OrganisationDepartment)
    private readonly departmentRepo: Repository<OrganisationDepartment>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createDepartment(data: {
    name: string;
    department_code?: string;
    description?: string;
    organisation_id: string;
    branch_id?: string;
    hod_id?: string;
  }) {
    // find organisation department by name or department code
    const foundDepartment = await this.departmentRepo.findOne({
      where: [
        {
          organisation: { id: data.organisation_id },
          name: data.name,
        },
        {
          organisation: { id: data.organisation_id },
          department_code: data.department_code,
        },
        {
          organisation: { id: data.organisation_id },
          description: data.description,
        },
      ],
    });

    if (foundDepartment)
      throw new BadRequestException(
        "Department exists. Check 'name', 'department code' or 'description'",
      );

    let headOfDepartment = null;
    if (data.hod_id) {
      headOfDepartment = await this.userRepo.findOne({
        where: { id: data.hod_id },
      });
      if (!headOfDepartment)
        throw new NotFoundException("Head of department not found");
    }

    const department = this.departmentRepo.create({
      name: data.name,
      department_code: data.department_code,
      description: data.description,
      organisation: { id: data.organisation_id },
      branch: { id: data.branch_id },
      head_of_department: { id: data.hod_id },
    });

    return await this.departmentRepo.save(department);
  }

  async getDepartmentsByOrganisation(
    organisation_id: string,
    page: number,
    pageSize: number,
  ) {
    let _page = page;
    let _pageSize = pageSize;
    if (isNaN(page) || page < 1) _page = 1;
    if (isNaN(pageSize) || pageSize < 1) _pageSize = 10;

    const skip = (_page - 1) * _pageSize;

    const [data, total] = await this.departmentRepo.findAndCount({
      where: { organisation: { id: organisation_id } },
      relations: ["head_of_department"],
      select: {
        id: true,
        name: true,
        head_of_department: {
          id: true,
          first_name: true,
          last_name: true,
        },
      },
      skip,
      take: _pageSize,
    });

    return {
      departments: data,
      metadata: {
        total,
        page: _page,
        pageSize: _pageSize,
        totalPages: Math.ceil(total / _pageSize),
      },
    };
  }

  async getDepartmentById(organisationId: string, departmentId: string) {
    const department = await this.departmentRepo.findOne({
      where: { id: departmentId, organisation: { id: organisationId } },
      relations: ["head_of_department"],
      select: {
        head_of_department: {
          id: true,
          first_name: true,
          last_name: true,
        },
      },
    });
    if (!department) throw new NotFoundException("Department not found");
    return department;
  }

  async bulkCreateDepartments(
    organisationId: string,
    data: { name: string }[],
    transactionalEntityManager?: EntityManager,
  ) {
    const departments = data.map((department) =>
      this.departmentRepo.create({
        name: department.name,
        organisation: { id: organisationId },
      }),
    );

    const manager = transactionalEntityManager || this.departmentRepo.manager;
    const result = await manager.insert(OrganisationDepartment, departments);

    return result.generatedMaps;
  }

  async updateDepartment(
    organisationId: string,
    departmentId: string,
    data: {
      name?: string;
      department_code?: string;
      description?: string;
      branch_id?: string;
      hod_id?: string;
    },
  ) {
    const department = await this.departmentRepo.findOne({
      where: { id: departmentId, organisation: { id: organisationId } },
      relations: ["organisation", "head_of_department"],
    });

    if (!department) throw new NotFoundException("Department not found");

    if (data.hod_id) {
      const headOfDepartment = await this.userRepo.findOne({
        where: { id: data.hod_id },
      });

      if (!headOfDepartment)
        throw new NotFoundException("Head of department not found");

      department.head_of_department = headOfDepartment;
    }

    Object.assign(department, data);
    return (await this.departmentRepo.save(department)).reload();
  }

  async deleteDepartment(
    organisationId: string,
    departmentId: string,
  ) {
    try {
      const department = await this.departmentRepo.manager.findOneOrFail(OrganisationDepartment, {
        where: { id: departmentId, organisation: { id: organisationId } },
      });

      // Clear relationships first
      department.head_of_department = null;
      await this.departmentRepo.manager.save(department);

      // Soft delete the department
      await this.departmentRepo.manager.softDelete(OrganisationDepartment, { id: departmentId });

      return { message: "Department deleted successfully" };
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new NotFoundException("Department not found");
      }
      throw error; // Bubble up other errors to abort transaction
    }
  }
}
