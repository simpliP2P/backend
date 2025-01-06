import { Module } from "@nestjs/common";
import { CloudinaryConfig } from "src/Config/cloudinaryClient.config";
import { UploadService } from "./Services/upload.service";

@Module({
    imports: [],
    controllers: [],
    providers: [CloudinaryConfig, UploadService],
    exports: [CloudinaryConfig, UploadService],
})

export class UploadModule {}