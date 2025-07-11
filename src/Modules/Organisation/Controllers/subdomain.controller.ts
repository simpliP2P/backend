import { Body, Controller, Post } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Organisation } from "../Entities/organisation.entity";
import { Repository } from "typeorm";

@Controller("subdomains")
export class SubdomainController {
  constructor(
    @InjectRepository(Organisation)
    private organisationRepository: Repository<Organisation>,
  ) {}

  @Post("verify")
  async verifySubdomain(@Body("subdomain") subdomain: string) {
    const organisation = await this.organisationRepository.findOne({
      where: { subdomain },
      select: ["name"],
    });

    if (!organisation) {
      return {
        status: "error",
        message: "Subdomain does not exist",
        data: {
          valid: false,
          exists: false,
        },
      };
    }

    return {
      status: "success",
      message: "Subdomain exists",
      data: { valid: true, exists: true, organization: organisation.name },
    };
  }
}
