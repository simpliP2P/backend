import { DataSource, Repository } from "typeorm";
import { UserOrganisation } from "../Entities/organisation.entity"; // Import the UserOrganisation entity
import { Injectable } from "@nestjs/common";

// Extending Repository to create a custom repository
@Injectable()
export class UserOrganisationRepository extends Repository<UserOrganisation> {
  constructor(dataSource: DataSource) {
    super(UserOrganisation, dataSource.createEntityManager());
  }

  // Find UserOrganisation by user ID and organisation ID
  async findByUserAndOrganisation(
    userId: string,
    organisationId: string,
  ): Promise<UserOrganisation | undefined> {
    try {
      const result = await this.findOne({
        where: {
          user: { id: userId },
          organisation: { id: organisationId },
        },
        relations: ["user", "organisation"],
      });
  
      return result ?? undefined;
      
    } catch (error) {
      throw error;
    }
  }

  // Create a new UserOrganisation
  async createUserOrganisation(
    userId: string,
    organisationId: string,
    role: string,
    permissions: string[],
  ): Promise<UserOrganisation> {
    const userOrganisation = this.create({
      user: { id: userId }, // Assuming User is referenced by ID
      organisation: { id: organisationId }, // Assuming Organisation is referenced by ID
      role,
      permissions,
    });
    return this.save(userOrganisation);
  }

}
