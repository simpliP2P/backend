import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { FileManagerController } from "../Controllers/file-manager.controller";
import { S3Service } from "../Services/s3-upload.service";
import { CloudinaryConfig } from "src/Config/cloudinaryClient.config";
import { FileManagerService } from "../Services/upload.service";

@Module({
  imports: [ConfigModule.forRoot()], // Load environment variables
  controllers: [FileManagerController],
  providers: [CloudinaryConfig, FileManagerService, S3Service],
  exports: [CloudinaryConfig, FileManagerService],
})
export class FileManagerModule {}
