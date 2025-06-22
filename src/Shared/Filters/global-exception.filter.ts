import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = "Internal server error";

    if (exception instanceof BadRequestException) {
      const responseBody = exception.getResponse();
      status = exception.getStatus();

      if (typeof responseBody === "object" && "message" in responseBody) {
        const extracted = (responseBody as any).message;
        if (Array.isArray(extracted)) {
          message = extracted[0];
        } else if (typeof extracted === "string") {
          message = extracted;
        } else {
          message = "Validation failed";
        }
      } else {
        message = "Bad request";
      }

      response.status(status).json({
        status: "error",
        error: "Validation failed",
        message,
      });
      return;
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      message =
        typeof responseBody === "string"
          ? responseBody
          : (responseBody as any).message || exception.message;
    } else if (typeof exception === "object" && exception !== null) {
      message = (exception as any).message || "Unhandled error occurred";
    }

    this.logger.error(
      `Unhandled error on ${request.method} ${request.url}`,
      (exception as any)?.stack || JSON.stringify(exception),
    );

    response.status(status).json({
      status: "error",
      message,
    });
  }
}
