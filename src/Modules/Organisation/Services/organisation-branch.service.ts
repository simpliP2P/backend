import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OrganisationBranch } from "../Entities/organisation-branch.entity";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";

@Injectable()
export class OrganisationBranchService {
  constructor(
    @InjectRepository(OrganisationBranch)
    private readonly branchRepo: Repository<OrganisationBranch>,
  ) {}

  async createBranch(data: {
    name: string;
    address: string;
    organisationId: string;
  }) {
    // find organisation department by name or department code
    const foundBranch = await this.branchRepo.findOne({
      where: [
        {
          organisation: { id: data.organisationId },
          name: data.name,
        },
      ],
    });

    if (foundBranch) throw new BadRequestException("Branch exists!");

    const branch = this.branchRepo.create({
      name: data.name,
      address: data.address,
      organisation: { id: data.organisationId },
    });

    return await this.branchRepo.save(branch);
  }

  async getBranchesByOrganisation(
    organisationId: string,
    page: number,
    pageSize: number,
  ) {
    let _page = page;
    let _pageSize = pageSize;
    if (isNaN(page) || page < 1) _page = 1;
    if (isNaN(pageSize) || pageSize < 1) _pageSize = 10;

    const skip = (_page - 1) * _pageSize; // Calculate the offset

    const [data, total] = await this.branchRepo.findAndCount({
      where: { organisation: { id: organisationId } },
      select: {
        id: true,
        name: true,
      },
      skip,
      take: _pageSize,
    });

    return {
      branches: data,
      metadata: {
        total,
        page: _page,
        pageSize: _pageSize,
        totalPages: Math.ceil(total / _pageSize),
      },
    };
  }

  async getBranchById(organisationId: string, branchId: string) {
    const branch = await this.branchRepo.findOne({
      where: { id: branchId, organisation: { id: organisationId } },
    });

    return branch;
  }

  async findOne(organisationId: string, branchId: string) {
    const branch = await this.branchRepo.findOne({
      where: { id: branchId, organisation: { id: organisationId } },
    });

    if (!branch) throw new NotFoundException("Branch not found");
    return branch;
  }
}
