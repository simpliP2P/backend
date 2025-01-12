import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Organisation,
  UserOrganisation,
} from "../Entities/organisation.entity";
import { FindOneOptions, Repository } from "typeorm";
import { CreateOrganisationInput } from "../Types/organisationTypes";
import { UserService } from "src/Modules/User/Services/user.service";
import { PermissionType } from "../Enums/userOrganisation.enum";
import { User } from "src/Modules/User/Entities/user.entity";
import { BadRequestException, UserNotFoundException } from "src/Shared/Exceptions/app.exceptions";

@Injectable()
export class OrganisationService {
  constructor(
    @InjectRepository(Organisation)
    private organisationRepository: Repository<Organisation>,
    @InjectRepository(UserOrganisation)
    private userOrganisationRepository: Repository<UserOrganisation>,

    private readonly userService: UserService,
  ) {}

  public async findOrganisation(
    query: FindOneOptions,
  ): Promise<Organisation | null> {
    return await this.organisationRepository.findOne(query);
  }

  async createOrganisation(
    createOrganisationInput: CreateOrganisationInput,
    creatorId: string,
  ): Promise<Organisation> {
    const { name, address, creator_role } = createOrganisationInput;

    let createdOrg: Organisation;

    try {
      const organisation = this.organisationRepository.create({
        name,
        address,
        creator: { id: creatorId } as User,
      });

      // Save the organisation to the db
      createdOrg = await this.organisationRepository.save(organisation);

      // Save the userOrganisation relation (creator is already validated implicitly)
      await this.userOrganisationRepository.save({
        user: { id: creatorId } as User,
        organisation: createdOrg,
        role: creator_role,
        permissions: [PermissionType.OWNER],
      });

    } catch (error) {
      if (error.code === "23505") {
        throw new BadRequestException(
          `Organisation with name ${name} already exists.`,
        );
      }

      if (error.message.includes("creator")) {
        throw new UserNotFoundException();
      }

      throw error;
    }

    return createdOrg;
  }

  // for delete, implement a soft delete
}
