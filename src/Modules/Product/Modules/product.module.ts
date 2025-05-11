import { Module } from "@nestjs/common";
import { ProductService } from "../Services/product.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "../Entities/product.entity";
import { OrganisationCategory } from "src/Modules/Organisation/Entities/organisation-category.entity";
import { ProductUploadController } from "../Controllers/product-upload.controller";
import { ProductBulkUploadService } from "../Services/product-bulk-upload.service";
import { UserOrganisationRepository } from "src/Modules/Organisation/Repositories/user-organisation.repository";
import { MailModule } from "src/Modules/Mail/mail.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, OrganisationCategory]),
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
