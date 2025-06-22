import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : (exception as any)?.message || "Internal server error";

    // Log full error
    this.logger.error(
      `Unhandled error: ${request.method} ${request.url}`,
      (exception as any)?.stack || JSON.stringify(exception),
    );

    this.logger.error(
      `Error response: ${JSON.stringify({
        status,
        message,
      })}`,
    );

    // Return standard response
    response.status(status).json({
      status: "error",
      message: "An unexpected error occurred",
    });
  }
}
