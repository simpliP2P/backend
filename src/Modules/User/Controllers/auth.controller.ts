import { Controller, Post, Body, Res, HttpStatus } from "@nestjs/common";
import { AuthService } from "../Services/auth.service";
import {
  SignUpDto,
  forgotPasswordDto,
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

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
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
  @ApiBody({ type: loginDto })
  async login(@Body() loginDto: loginDto, @Res() res: Response): Promise<void> {
    try {
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
          data: { user },
        });
    } catch (error) {
      throw error;
    }
  }

  @Post("verify-email")
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

  @Post("forgot-password")
  @ApiBody({ type: forgotPasswordDto })
  async forgotPassword(
    @Body() body: forgotPasswordDto,
  ): Promise<ApiResponse<{}>> {
    try {
      await this.authService.forgotPassword(body.email);

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
  @ApiBody({ type: resetPasswordDto })
  async resetPassword(
    @Body() body: resetPasswordDto,
  ): Promise<ApiResponse<{}>> {
    try {
      await this.authService.resetPassword(body.token, body.newPassword);

      return {
        status: "success",
        message: "Password reset successful",
        data: {},
      };
    } catch (error) {
      throw error;
    }
  }
}
