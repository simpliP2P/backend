import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { TokenType } from "src/Modules/Token/Enums/token.enum";
import { TokenService } from "src/Modules/Token/Services/token.service";

@Injectable()
export class ResourceGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const token = request.headers["x-resource-token"];

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    const decodedToken = await this.tokenService.verifyToken(
      token,
      TokenType.RESOURCE_TOKEN,
    );

    request.resourceData = decodedToken;
    return true;
  }
}
