import { Body, Controller, Headers, Post } from "@nestjs/common";
import { Public } from "src/Shared/Decorators/custom.decorator";
import { OrganisationService } from "../Services/organisation.service";

@Controller("subdomains")
export class SubdomainController {
  constructor(private readonly organisationService: OrganisationService) {}

  @Post("verify")
  @Public()
  async verifySubdomain(
    @Body() body: { subdomain: string },
    @Headers() headers: Record<string, string>,
  ) {
    const reqSignature = headers["x-signature"];
    const timestamp = headers["x-timestamp"];

    const { name: subdomainName } =
      await this.organisationService.verifyOrgSubdomain(
        body.subdomain,
        reqSignature,
        timestamp,
      );

    if (!subdomainName) {
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
      data: { valid: true, exists: true, organization: subdomainName },
    };
  }
}
