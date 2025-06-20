import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from "@nestjs/common";
import { Response } from "express";

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Get the validation errors from the exception response
    const responseBody = exception.getResponse();

    let validationErrors: string[] | string = [];

    if (typeof responseBody === "object" && "message" in responseBody) {
      const message = (responseBody as any).message;

      if (Array.isArray(message)) {
        validationErrors = message[0];
      } else if (typeof message === "string") {
        validationErrors = message;
      } else {
        validationErrors = "An unknown validation error occurred";
      }
    }

    response.status(400).json({
      status: "error",
      error: "validation failed",
      message: validationErrors,
    });
  }
}
