import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  // ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
// import { ConfigService } from "@nestjs/config";
import { TokenHelper } from "src/Shared/Helpers/token.helper";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tokenHelper: TokenHelper,
    // private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.get<boolean>(
      "isPublic",
      context.getHandler(),
    );
    if (isPublic) {
      return true; // Skip the guard if the route is public
    }

    const request = context.switchToHttp().getRequest();

    /*
    const isProdEnv = this.configService.getOrThrow<string>("isAppInProduction");
    const stagingClient = this.configService.getOrThrow<string>(
      "clients.staging.landingPage",
    );
    const productionClient = this.configService.getOrThrow<string>(
      "clients.production.landingPage",
    );

    if (isProdEnv) {
      // Allowed client hosts
      const allowedOrigins = [stagingClient, productionClient];

      const origin = request.get("origin") || request.get("referer");

      if (
        !origin ||
        !allowedOrigins.some((allowed) => origin.startsWith(allowed))
      ) {
        throw new ForbiddenException("Access denied");
      }
    }
    */

    const token = request.headers["authorization"]?.split(" ")[1]; // Extract JWT token

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    try {
      const decoded = this.tokenHelper.verifyAccessToken(token);
      request.user = decoded; // Attach the decoded user to the request
      return true;
    } catch (error) {
      throw new UnauthorizedException(
        "Invalid or expired token: " + error.message,
      );
    }
  }
}
