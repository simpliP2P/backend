import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserOrganisationRepository } from "src/Modules/Organisation/Repositories/userOrganisation.repository";
import { PermissionType } from "src/Modules/Organisation/Enums/userOrganisation.enum";

@Injectable()
export class OrganisationPermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userOrganisationRepository: UserOrganisationRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<PermissionType[]>(
      "permissions",
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true; // If no permissions are required, allow access
    }

    const request = context.switchToHttp().getRequest();

    // user attached to the request, via JWT token (refer to express.d.ts file)
    const userId = request.user.sub;

    // Assuming the organisation ID is passed in the request params or body
    const organisationId =
      request.params.organisationId || request.body.organisationId;

    const userOrganisation =
      await this.userOrganisationRepository.findByUserAndOrganisation(
        userId,
        organisationId,
      );

    // User is not part of the organisation
    if (!userOrganisation) {
      return false;
    }

    if (!userOrganisation.is_creator || !userOrganisation.accepted_invitation) {
      throw new UnauthorizedException("User has not accepted the invitation");
    }

    /**
     * At this point, we are sure that the user is part of the organisation.
     * Now, allow access if ORG_MEMBER permission is required.
     */
    if (requiredPermissions.includes(PermissionType.ORG_MEMBER)) {
      return true;
    }

    // Check if user has the required permissions
    const hasPermission = requiredPermissions.some((permission) =>
      userOrganisation?.permissions.includes(permission),
    );

    // Return true if the user has the required permissions, otherwise false
    return hasPermission;
  }
}
