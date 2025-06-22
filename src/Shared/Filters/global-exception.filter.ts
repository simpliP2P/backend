import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { RESPONSE_STATUS_CODE } from "../Interfaces/response.enum";
import { RESPONSE_STATUS } from "../Interfaces/response.enum";

const AppLogger = new Logger("GlobalException");

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response: Response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const theResponse = isHttpException
      ? exception.getResponse()
      : (exception as any)?.message || "Unexpected server error";

    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status === 500) {
      AppLogger.error(
        `INTERNAL ERROR:`,
        typeof exception === "object" && exception
          ? (exception as any)?.stack || JSON.stringify(exception)
          : String(exception),
      );

      return response.status(500).json({
        status: RESPONSE_STATUS.ERROR,
        message: "Unexpected error occurred",
        error: typeof theResponse === "string" ? theResponse : null,
      });
    }

    if (status === 400) {
      const message =
        typeof theResponse === "object" && "message" in theResponse
          ? (theResponse as any).message
          : "Bad request";

      AppLogger.warn(`BAD REQUEST: ${JSON.stringify(message)}`);

      if (Array.isArray(message)) {
        return response.status(422).json({
          status: RESPONSE_STATUS.ERROR,
          message: "Bad input data",
          error: this.reprocessError(message),
        });
      }

      return response.status(400).json({
        status: RESPONSE_STATUS.ERROR,
        message,
        error: message,
      });
    }

    // All other known non-500 exceptions
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
