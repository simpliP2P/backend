import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";

@Injectable()
export class CloudinaryConfig {
  public cloudinary: typeof cloudinary;

  constructor(private readonly configService: ConfigService) {
    this.cloudinary = cloudinary;
    this.configureCloudinary();
  }

  private configureCloudinary(): void {
    this.cloudinary.config({
      cloud_name: this.configService.get<string>("cloudinary.cloudName"),
      api_key: this.configService.get<string>("cloudinary.apiKey"),
      api_secret: this.configService.get<string>("cloudinary.apiSecret"),
      secure: true,
    });
  }
}
