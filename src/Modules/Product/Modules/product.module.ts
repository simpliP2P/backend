import { Module } from "@nestjs/common";
import { ProductService } from "../Services/product.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "../Entities/product.entity";
import { OrganisationCategory } from "src/Modules/Organisation/Entities/organisation-category.entity";
import { ProductUploadController } from "../Controllers/product-upload.controller";
import { ProductBulkUploadService } from "../Services/product-bulk-upload.service";
import { MulterModule } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { UserOrganisationRepository } from "src/Modules/Organisation/Repositories/user-organisation.repository";
import { MailModule } from "src/Modules/Mail/mail.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, OrganisationCategory]),
    MulterModule.register({
      storage: diskStorage({
        destination: "./uploads/products",
        filename: (_, file, cb) => {
          // Generate unique filename
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          const fileExt = extname(file.originalname);
          cb(null, `product-upload-${uniqueSuffix}${fileExt}`);
        },
      }),
      fileFilter: (_, file, cb) => {
        // Accept only CSV and Excel files
        if (
          file.mimetype === "text/csv" ||
          file.mimetype === "application/vnd.ms-excel" ||
          file.mimetype ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ) {
          cb(null, true);
        } else {
          cb(new Error("Only CSV and Excel files are allowed"), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
      },
    }),
    MailModule,
  ],
  controllers: [ProductUploadController],
  providers: [
    ProductService,
    ProductBulkUploadService,
    UserOrganisationRepository,
  ],
  exports: [ProductService],
})
export class ProductModule {}
