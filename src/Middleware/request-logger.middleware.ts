import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { AppLogger } from "../Logger/logger.service";

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private logger: AppLogger) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl } = req;

    res.on("finish", () => {
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      const timeString = new Date().toLocaleTimeString("en-GB", {
        timeZoneName: "short",
      });
      const statusCode = res.statusCode;
      const statusText = `${statusCode} ${res.statusMessage}`;

      // Colorize the status text
      let coloredStatus = statusText;
      if (statusCode >= 500) {
        coloredStatus = `\x1b[31m${statusText}\x1b[0m`; // Red for 5xx
      } else if (statusCode >= 400) {
        coloredStatus = `\x1b[33m${statusText}\x1b[0m`; // Yellow for 4xx
      } else if (statusCode >= 300) {
        coloredStatus = `\x1b[36m${statusText}\x1b[0m`; // Cyan for 3xx
      } else if (statusCode >= 200) {
        coloredStatus = `\x1b[32m${statusText}\x1b[0m`; // Green for 2xx
      }

      const formattedLog = `${timeString} ${method.padEnd(3)} ${originalUrl.padEnd(
        8,
      )} ${coloredStatus.padEnd(5)} ${processingTime}ms`;
      this.logger.log(formattedLog);
    });

    next();
  }
}
