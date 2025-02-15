import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { UserService } from "../Services/user.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { join } from "path";
import { existsSync, unlink } from "fs";
import { AppLogger } from "src/Logger/logger.service";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";
import { ApiResponse } from "src/Shared/Interfaces/api-response.interface";
import { SanitizedUser } from "../Types/auth.types";
import { UpdateUserProfileDto } from "../Dtos/user.dto";
import { Request } from "express";

@Controller("users")
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: AppLogger,
  ) {}

  @Get("me")
  async getProfile(@Req() req: any): Promise<ApiResponse<SanitizedUser>> {
    const userId = req.user.sub;
    const user = await this.userService.getUserProfile(userId);
    return {
      status: "success",
      message: "User profile retrieved successfully",
      data: user,
    };
  }

  @Put("me")
  async updateProfile(
    @Body() data: UpdateUserProfileDto,
    @Req() req: Request,
  ): Promise<ApiResponse<SanitizedUser>> {
    const userId = req.user.sub;
    const user = await this.userService.updateAccount(userId, data);

    return {
      status: "success",
      message: "User profile updated successfully",
      data: user,
    };
  }

  @Post("me/profile-picture")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 0.1 * 1024 * 1024 }, // max: approx. 100KB
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/image\/(jpeg|png|jpg)$/)) {
          return callback(new BadRequestException("Invalid file type"), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ): Promise<ApiResponse<{ url: string }>> {
    try {
      if (!file) {
        throw new BadRequestException("No file uploaded");
      }

      const userId: string = req.user.sub;

      const url = await this.userService.uploadProfilePicture(
        userId,
        file,
        req,
      );

      return {
        status: "success",
        message: "Profile picture uploaded successfully",
        data: { url },
      };
    } catch (error) {
      throw error;
    }
  }
}
