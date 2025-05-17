import {
  Controller,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  SetMetadata,
  UseGuards,
  Logger,
  Req,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { ProductBulkUploadService } from "../Services/product-bulk-upload.service";
import { OrganisationPermissionsGuard } from "src/Guards/permissions.guard";
import * as fs from "fs";
import { PermissionType } from "src/Modules/Organisation/Enums/user-organisation.enum";
import { Request } from "express";

@Controller("organisations/:organisationId/products/upload")
export class ProductUploadController {
  private readonly logger = new Logger(ProductUploadController.name);

  constructor(
    private readonly productBulkUploadService: ProductBulkUploadService,
  ) {
    // Create uploads directory if it doesn't exist
    const uploadDir = "./uploads/temp";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  @Post("bulk")
  @SetMetadata("permissions", [PermissionType.OWNER])
  @UseGuards(OrganisationPermissionsGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads/temp",
        filename: (_, file, cb) => {
          // Generate unique filename
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `product-upload-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (_, file, cb) => {
        // Validate file type
        const validMimeTypes = [
          "text/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/csv", // Additional MIME type for CSV files
          "text/plain", // Some systems might send CSV as text/plain
        ];

        // Also check file extension
        const validExtensions = [".csv", ".xls", ".xlsx"];
        const fileExt = extname(file.originalname).toLowerCase();

        // Accept if either MIME type or extension matches
        if (
          validMimeTypes.includes(file.mimetype) ||
          validExtensions.includes(fileExt)
        ) {
          return cb(null, true);
        }

        return cb(
          new BadRequestException("Please upload a CSV or Excel file"),
          false,
        );
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  public async uploadProducts(
    @Param("organisationId") organisationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    try {
      const userId = req.user.sub;

      if (!file) {
        throw new BadRequestException("Please upload a file");
      }

      // Process the file upload
      await this.productBulkUploadService.processProductFileUpload(
        file,
        organisationId,
        userId,
      );

      return {
        status: "success",
        message: "Bulk upload in progress, mail will be sent once done",
        data: {},
      };
    } catch (error) {
      this.logger.error(
        `Error in uploadProducts: ${error.message}`,
        error.stack,
      );
      // Clean up the temporary file in case of errors
      if (file && file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      throw error;
    }
  }
}
