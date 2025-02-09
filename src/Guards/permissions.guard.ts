import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { isUUID } from "class-validator";
import { PermissionType } from "src/Modules/Organisation/Enums/user-organisation.enum";
import { UserOrganisationRepository } from "src/Modules/Organisation/Repositories/user-organisation.repository";

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
      request.params.organisationId ||
      request.body.organisationId ||
      request.headers.Oid;

    if (!isUUID(organisationId)) {
      throw new ForbiddenException("Organisation ID is required");
    }

    const userOrganisation =
      await this.userOrganisationRepository.findByUserAndOrganisation(
        userId,
        organisationId,
      );

    if (userOrganisation?.deactivated_at) {
      throw new ForbiddenException(
        "Account has been deactivated. Contact your organisation admin if you think this is an error.",
      );
    }

    // User is not part of the organisation
    if (!userOrganisation) {
      return false;
    }

    if (!userOrganisation.is_creator && !userOrganisation.accepted_invitation) {
      throw new ForbiddenException("User has not accepted the invitation");
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
