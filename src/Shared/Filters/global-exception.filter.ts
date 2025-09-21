import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import {
  RESPONSE_STATUS,
  RESPONSE_STATUS_CODE,
} from "../Interfaces/response.enum";

const logger = new Logger("GlobalException");

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor() {
    this.setupProcessHandlers();
  }

  private setupProcessHandlers() {
    process.removeAllListeners("unhandledRejection");
    process.on("unhandledRejection", (reason: unknown) => {
      logger.error("🚨 Unhandled Promise Rejection:", reason);
    });

    process.removeAllListeners("uncaughtException");
    process.on("uncaughtException", (error: Error) => {
      logger.error("🔥 Uncaught Exception:", error.message);
      process.exit(1);
    });

    process.on("SIGTERM", () => {
      logger.log("SIGTERM received, shutting down gracefully");
      process.exit(0);
    });

    process.on("SIGINT", () => {
      logger.log("SIGINT received, shutting down gracefully");
      process.exit(0);
    });
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const isHttpException = exception instanceof HttpException;

    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = this.getErrorMessage(exception, isHttpException);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      logger.error("Internal Server Error:", message);
      return this.sendErrorResponse(
        response,
        500,
        "Unexpected error occurred",
        message,
      );
    }

    if (status === HttpStatus.BAD_REQUEST && Array.isArray(message)) {
      logger.warn("Validation Error:", message);
      return this.sendErrorResponse(
        response,
        422,
        "Bad input data",
        this.formatValidationErrors(message),
      );
    }

    logger.log(`Response: ${message} [${status}]`);

    return this.sendErrorResponse(
      response,
      status,
      message,
      null,
      this.isSuccessStatus(status),
    );
  }

  private getErrorMessage(exception: unknown, isHttpException: boolean): any {
    if (isHttpException) {
      const response = (exception as HttpException).getResponse();
      return typeof response === "object" && "message" in response
        ? (response as any).message
        : response;
    }
    return (exception as any)?.message || "Unexpected server error";
  }

  private sendErrorResponse(
    response: Response,
    statusCode: number,
    message: string,
    error: any = null,
    isSuccess = false,
  ) {
    return response.status(statusCode).json({
      status: isSuccess ? RESPONSE_STATUS.SUCCESS : RESPONSE_STATUS.ERROR,
      message,
      error,
      statusCode,
    });
  }

  private formatValidationErrors(errors: string[]): Record<string, string> {
    const errorMap: Record<string, string> = {};
    const fields = new Set(errors.map((err) => err.split(" ")[0]));

    fields.forEach((field) => {
      const matchedError = errors.find((err) => err.startsWith(field));
      if (matchedError) errorMap[field] = matchedError;
    });

    return errorMap;
  }

  private isSuccessStatus(status: number): boolean {
    return [RESPONSE_STATUS_CODE.OK, RESPONSE_STATUS_CODE.CREATED].includes(
      status,
    );
  }
}
