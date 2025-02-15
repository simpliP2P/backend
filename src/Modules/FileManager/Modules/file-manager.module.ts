import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { FileManagerController } from "../Controllers/file-manager.controller";
import { CloudinaryConfig } from "src/Config/cloudinaryClient.config";
import { FileManagerService } from "../Services/upload.service";

@Module({
  imports: [ConfigModule.forRoot()], // Load environment variables
  controllers: [FileManagerController],
  providers: [CloudinaryConfig, FileManagerService],
  exports: [CloudinaryConfig, FileManagerService],
})
export class FileManagerModule {}
