import { Module } from "@nestjs/common";
import { UserOrganisationRepository } from "../Repositories/user-organisation.repository";

@Module({
  providers: [UserOrganisationRepository],
  exports: [UserOrganisationRepository],
})
export class OrganisationAccessModule {}
