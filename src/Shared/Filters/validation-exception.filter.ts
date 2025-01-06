import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from "@nestjs/common";
import { ValidationError } from "class-validator";
import { Response } from "express";

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Get the validation errors from the exception response
    const responseBody = exception.getResponse();

    let validationErrors: any;
    if (typeof responseBody === "object" && "message" in responseBody) {
      validationErrors = (responseBody as any).message[0];
    }

    response.status(400).json({
      status: "error",
      message: "validation failed",
      error: validationErrors,
    });
  }
}
