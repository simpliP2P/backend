import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthService } from "../Services/auth.service";
import {
  SignUpDto,
  initiateResetPasswordDto,
  loginDto,
  resetPasswordDto,
  verifyEmailDto,
} from "../Dtos/auth.dto";
import { ApiResponse } from "src/Shared/Interfaces/api-response.interface";
import { Request, Response } from "express";
import { Public } from "src/Shared/Decorators/custom.decorator";
// import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
// import { CustomThrottlerGuard } from "src/Guards/custom-throttler.guard";

@Controller("auth")
// @UseGuards(CustomThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  @Public()
  // @Throttle({ default: { limit: 1, ttl: 60 } }) // 1 request per minute
  async signUp(@Body() signUpDto: SignUpDto): Promise<ApiResponse<{}>> {
    try {
      await this.authService.signUp(signUpDto);

      return {
        status: "success",
        message: "Check your email for verification link",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }

  @Post("login")
  @Public()
  // @Throttle({ default: { limit: 5, ttl: 60 } })
  async login(
    @Body() loginDto: loginDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      this.validateLoginInput(loginDto);
      const { tokens, user } = await this.authService.login(loginDto, req);

      res
        .cookie("access_token", tokens.access_token, {
          httpOnly: true, // Prevents client-side JavaScript access
          secure: process.env.NODE_ENV === "production", // Ensures cookies are sent over HTTPS in production
          sameSite: "strict", // Protects against CSRF attacks
          maxAge: 1000 * 60 * 60, // 1 hour
        })
        .status(HttpStatus.OK)
        .json({
          status: "success",
          message: "Login successful",
          data: {
            user,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          },
        });
    } catch (error) {
      throw error;
    }
  }

  @Post("verify-email")
  @Public()
  async verifyEmail(@Body() body: verifyEmailDto): Promise<ApiResponse<{}>> {
    try {
      await this.authService.verifyEmail(body.token);

      return {
        status: "success",
        message: "Email verified successfully",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }

  @Post("initiate-reset-password")
  @Public()
  async initiateResetPassword(
    @Body() body: initiateResetPasswordDto,
  ): Promise<ApiResponse<{}>> {
    try {
      await this.authService.initiateResetPassword(body.email);

      return {
        status: "success",
        message: "Check your email for password reset link",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }

  @Post("reset-password")
  @Public()
  async resetPassword(
    @Body() body: resetPasswordDto,
  ): Promise<ApiResponse<{}>> {
    try {
      await this.authService.resetPassword(body.token, body.new_password);

      return {
        status: "success",
        message: "Password reset successful",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }

  @Post("refresh-token")
  @Public()
  async refreshToken(
    @Req() req: Request,
    @Body() body: { oldRefreshToken: string },
    @Res() res: Response,
  ): Promise<void> {
    try {
      const { access_token, refresh_token } =
        await this.authService.refreshAccessToken(body.oldRefreshToken, req);

      res
        .cookie("access_token", access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 1000 * 60 * 60,
        })
        .status(HttpStatus.OK)
        .json({
          status: "success",
          message: "Token refreshed",
          data: { access_token, refresh_token },
        });
    } catch (error) {
      throw error;
    }
  }

  @Post("logout")
  async logout(
    @Res() res: Response,
    @Body() body: { refreshToken: string },
  ): Promise<void> {
    try {
      await this.authService.logout(body.refreshToken);

      res
        .clearCookie("access_token")
        .status(HttpStatus.OK)
        .json({
          status: "success",
          message: "Logged out successfully",
          data: {},
        });
    } catch (error) {
      throw error;
    }
  }

  @Post("logout-all")
  async logoutAll(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: { userId: string },
  ): Promise<void> {
    try {
      const userId = req.user.sub;
      
      if (req.user.sub !== body.userId) {
        throw new UnauthorizedException("Unauthorized!");
      }
      
      await this.authService.logoutAll(userId);
      res
        .clearCookie("access_token")
        .status(HttpStatus.OK)
        .json({
          status: "success",
          message: "Logged out of all devices",
          data: {},
        });
    } catch (error) {
      throw error;
    }
  }

  private validateLoginInput(loginDto: loginDto): void {
    if (!loginDto.email || !loginDto.password) {
      throw new UnauthorizedException("Email and password are required");
    }
  }
}
