import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TokenHelper } from "src/Shared/Helpers/token.helper";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector, private tokenHelper: TokenHelper) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.get<boolean>(
      "isPublic",
      context.getHandler(),
    );
    if (isPublic) {
      return true; // Skip the guard if the route is public
    }

    const request = context.switchToHttp().getRequest();
    const token = request.headers["authorization"]?.split(" ")[1]; // Extract JWT token

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    try {
      const decoded = this.tokenHelper.verifyAccessToken(token);
      request.user = decoded; // Attach the decoded user to the request
      return true;
    } catch (error) {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
