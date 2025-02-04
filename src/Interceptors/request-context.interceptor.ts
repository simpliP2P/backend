import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Request } from "express";
import { RequestContext } from "src/Shared/Helpers/requestContext.helper";

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user; // Extract user from JWT
    const orgId = request.params.organisationId; // Extract organisation ID from URL

    return RequestContext.run({ userId: user?.sub, organisationId: orgId }, async () => {
      return next.handle();
    });
  }
}
