import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from "@nestjs/common";
import { Request } from "express";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import {
  extractSubdomain,
  isValidSubdomain,
} from "src/Shared/Helpers/subdomain.helper";
import { DataSource } from "typeorm";

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly datasource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const host = req.hostname;
    const subdomain = extractSubdomain(host);
    const user = context.switchToHttp().getRequest().user;

    if (subdomain && subdomain !== "app" && subdomain !== "www") {
      if (!isValidSubdomain(subdomain)) {
        throw new BadRequestException("Invalid subdomain");
      }

      const organisation = await this.getOrgFromSubdomain(subdomain);

      req["tenant"] = {
        id: organisation.id,
        subdomain: organisation.subdomain,
        orgName: organisation.name,
      };
    } else {
      const userId = user?.id;

      req["tenant"] = userId && {
        id: userId,
        subdomain: null,
      };
    }

    return true;
  }

  private async getOrgFromSubdomain(subdomain: string): Promise<Organisation> {
    const organisation = await this.datasource
      .getRepository(Organisation)
      .findOne({
        where: { subdomain },
        select: ["id", "name", "subdomain", "is_active"],
      });

    if (!organisation) throw new BadRequestException("Invalid subdomain");

    if (!organisation.is_active) {
      throw new BadRequestException("Organization is inactive");
    }

    return organisation;
  }
}
