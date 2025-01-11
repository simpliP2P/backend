import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { Response } from "express";
import { GoogleOAuthServices } from "./../Services/googleOauth.service";
import { HandleCustomerGoogleLoginCallbackInput } from "../Dtos/googleOauth.dto";
import { Public } from "src/Shared/Decorators/custom.decorator";

@Controller("auth/google")
export class GoogleOAuthController {
  constructor(private readonly googleOAuthServices: GoogleOAuthServices) {}

  @Public()
  @Get("initiate")
  initiateSignUpOrLogin(@Res() res: Response): void {
    const googleAuthUrl =
      this.googleOAuthServices.initiateSignUpOrLoginCustomerWithGoogle();

    res.status(HttpStatus.CREATED).json({
      status: "success",
      message: "Google login/signup initiated",
      data: { url: googleAuthUrl },
    });
  }

  @Public()
  @Post("callback")
  async handleCallback(
    @Body() body: HandleCustomerGoogleLoginCallbackInput,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const { code } = body;

      if (!code) {
        throw new BadRequestException("Authorization code is missing");
      }

      const result =
        await this.googleOAuthServices.handleCustomerGoogleSignUpOrLoginCallback(
          { code },
        );

      res.status(HttpStatus.OK).json({
        status: "success",
        message: "Google login/signup successful",
        data: result,
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: "error",
        message:
          error.message || "An error occurred during the callback process",
      });
    }
  }
}
