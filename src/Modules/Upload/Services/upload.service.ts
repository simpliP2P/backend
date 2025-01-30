import { Injectable } from "@nestjs/common";
import { CloudinaryConfig } from "src/Config/cloudinaryClient.config";

@Injectable()
export class UploadService {
  constructor(private readonly cloudinaryConfig: CloudinaryConfig) {}

  async uploadImage(filePath: string): Promise<string> {
    try {
      const { secure_url } =
        await this.cloudinaryConfig.cloudinary.uploader.upload(filePath);

      return secure_url;
    } catch (error) {
      throw error;
    }
  }

  async removeImage(url: string): Promise<void> {
    try {
      const imgPublicId = this.getPublicIdFromUrl(url);

      if (!imgPublicId) return;

      await this.cloudinaryConfig.cloudinary.uploader.destroy(imgPublicId);
    } catch (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  getPublicIdFromUrl(url: string): string {
    // Regex to capture public_id before any image extension
    const regex = /\/([^/]+)\.(jpg|jpeg|png)$/;
    const match = url.match(regex);

    return match ? match[1] : "";
  }
}
