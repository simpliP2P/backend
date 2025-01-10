import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserService } from "../Services/user.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { join } from "path";
import { existsSync, unlink } from "fs";

@ApiTags("user")
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("profile-picture")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "../../uploads",
        filename: (req, file, callback) => {
          const uniqueName = `${Date.now()}-${file.originalname}`;
          callback(null, uniqueName);
        },
      }),
      limits: { fileSize: 0.3 * 1024 * 1024 }, // approx. 300MB
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/image\/(jpeg|png|jpg)$/)) {
          return callback(new BadRequestException("Invalid file type"), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadcompanyLogo(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ): Promise<any> {
    try {
      if (!file) {
        throw new BadRequestException("No file uploaded");
      }

      const userId = req.user.sub;

      const url = await this.userService.uploadProfilePicture(userId, file);

      // Delete the local file after processing
      const filePath = join("../../uploads", file.filename);
      if (existsSync(filePath)) {
        unlink(filePath, (err) => {
          if (err) {
            console.error("Error deleting file:", err);
          }
        });
      } else {
        console.warn(`File not found for deletion: ${filePath}`);
      }

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
