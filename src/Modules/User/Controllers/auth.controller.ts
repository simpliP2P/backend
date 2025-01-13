import { Controller, Post, Body, Res, HttpStatus, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../Services/auth.service";
import {
  SignUpDto,
  initiateResetPasswordDto,
  loginDto,
  resetPasswordDto,
  verifyEmailDto,
} from "../Dtos/auth.dto";
import { ApiResponse } from "src/Shared/Interfaces/api-response.interface";
import { Response } from "express";
import {
  ApiTags,
  ApiBody,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import { Public } from "src/Shared/Decorators/custom.decorator";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  @Public()
  @ApiBody({ type: SignUpDto })
  @SwaggerApiResponse({
    status: 201,
    description: "User signed up successfully",
  })
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
  @ApiBody({ type: loginDto })
  async login(@Body() loginDto: loginDto, @Res() res: Response): Promise<void> {
    try {
      this.validateLoginInput(loginDto);
      const { token, user } = await this.authService.login(loginDto);

      res
        .cookie("access_token", token, {
          httpOnly: true, // Prevents client-side JavaScript access
          secure: process.env.NODE_ENV === "production", // Ensures cookies are sent over HTTPS in production
          sameSite: "strict", // Protects against CSRF attacks
          maxAge: 1000 * 60 * 60, // 1 hour
        })
        .status(HttpStatus.OK)
        .json({
          status: "success",
          message: "Login successful",
          data: { user, access_token: token },
        });
    } catch (error) {
      throw error;
    }
  }

  @Post("verify-email")
  @Public()
  @ApiBody({ type: verifyEmailDto })
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
  @ApiBody({ type: initiateResetPasswordDto })
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
  @ApiBody({ type: resetPasswordDto })
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

  private validateLoginInput(loginDto: loginDto): void {
    if (!loginDto.email || !loginDto.password) {
      throw new UnauthorizedException("Email and password are required");
    }
  }
}
