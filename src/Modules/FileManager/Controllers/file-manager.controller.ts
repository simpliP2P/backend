import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { S3Service } from "../Services/s3-upload.service";
import { Request } from 'express';
import { Public } from "src/Shared/Decorators/custom.decorator";

@Controller("files")
export class FileManagerController {
  constructor(private readonly s3FileManagerService: S3Service) {}

  // @Public()
  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    try {
      if (!file) {
        throw new Error("No file uploaded");
      }

      const fileUrl = await this.s3FileManagerService.uploadFile(file);

      // Construct the base URL dynamically
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      return {
        status: "success",
        message: "File uploaded successfully",
        url: `${baseUrl}/files/${fileUrl}`,
      };
    } catch (error) {
      throw error;
    }
  }

  @Public()
  @Get(":key")
  async getFile(@Param("key") key: string, @Res() res: any) {
    
    const { stream, contentType } =
      await this.s3FileManagerService.getFileStream(key);

    res.set({
      "Content-Type": contentType, // Set correct MIME type (e.g., image/png, video/mp4)
      "Cache-Control": "public, max-age=31536000, immutable", // Cache optimization
    });

    stream.pipe(res); // Stream file directly for inline rendering
  }
}
