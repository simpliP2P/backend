import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { ApiResponse } from "./Shared/Interfaces/api-response.interface";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot(): ApiResponse<{}> {
    return {
      status: "success",
      message: this.appService.getRoot(),
      data: {
        service: "Simplip2p-api",
        version: "1.0.0",
      },
    };
  }
}
