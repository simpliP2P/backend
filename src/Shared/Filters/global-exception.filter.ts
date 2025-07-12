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
  RESPONSE_STATUS_CODE,
  RESPONSE_STATUS,
} from "../Interfaces/response.enum";

const AppLogger = new Logger("GlobalException");

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response: Response = ctx.getResponse<Response>();

    // Ensure compatibility with both Nest's and custom exceptions
    const status =
      typeof (exception as any)?.getStatus === "function"
        ? (exception as HttpException).getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const theResponse =
      typeof (exception as any)?.getResponse === "function"
        ? (exception as HttpException).getResponse()
        : (exception as any)?.message || "Unexpected server error";

    // Handle internal server errors
    if (status === 500) {
      AppLogger.error(
        `INTERNAL ERROR:`,
        theResponse,
      );

      return response.status(500).json({
        status: RESPONSE_STATUS.ERROR,
        message: "Unexpected error occurred",
        // error: typeof theResponse === "string" ? theResponse : null,
        error: theResponse,
        statusCode: 500,
      });
    }

    // Handle bad requests (e.g. from DTO validation or custom 400s)
    if (status === 400) {
      const message =
        typeof theResponse === "object" && "message" in theResponse
          ? (theResponse as any).message
          : "Bad request";

      AppLogger.warn(`BAD REQUEST: ${JSON.stringify(message)}`);

      // Validation error: array of strings
      if (Array.isArray(message)) {
        return response.status(422).json({
          status: RESPONSE_STATUS.ERROR,
          message: "Bad input data",
          error: this.reprocessError(message),
          statusCode: 422,
        });
      }

      // Direct custom BadRequestException
      return response.status(400).json({
        status: RESPONSE_STATUS.ERROR,
        message,
        error: null,
        statusCode: 400,
      });
    }

    // Other known exceptions (403, 404, etc.)
    const finalStatus =
      typeof (theResponse as any)?.statusCode === "number"
        ? (theResponse as any).statusCode
        : status;

    const finalMessage =
      typeof theResponse === "object" && "message" in theResponse
        ? (theResponse as any).message
        : theResponse;

    AppLogger.log(`Response: ${finalMessage} [statusCode: ${finalStatus}]`);

    return response.status(finalStatus).json({
      status: [RESPONSE_STATUS_CODE.OK, RESPONSE_STATUS_CODE.CREATED].includes(
        finalStatus,
      )
        ? RESPONSE_STATUS.SUCCESS
        : RESPONSE_STATUS.ERROR,
      message: finalMessage,
      error: null,
      statusCode: finalStatus,
    });
  }

  private reprocessError(theErrors: string[]): Record<string, string> {
    const errorField = theErrors.map((err) => err.split(" ")[0]);
    const errorMap: Record<string, string> = {};

    for (const field of new Set(errorField)) {
      const matchedError = theErrors.find((err) => err.startsWith(field));
      if (matchedError) {
        errorMap[field] = matchedError;
      }
    }

    return errorMap;
  }
}
