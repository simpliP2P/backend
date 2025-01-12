import { Body, Controller, Post, Req } from "@nestjs/common";
import { OrganisationService } from "../Services/organisation.service";
import { CreateOrganisationDto } from "../Dtos/organisation.dto";
import { Request } from "express";

@Controller("organisations")
export class OrganisationController {
  constructor(private readonly organisationService: OrganisationService) {}

  @Post()
  async createOrganisation(
    @Body() createOrganisationDto: CreateOrganisationDto,
    @Req() req: Request,
  ) {
    try {
      const organisation = await this.organisationService.createOrganisation(
        createOrganisationDto,
        req.user.sub,
      );

      return {
        status: "success",
        message: "organisation created successfully",
        data: organisation,
      };
    } catch (error) {
      throw error;
    }
  }
}
