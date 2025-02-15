import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Upload } from "@aws-sdk/lib-storage";
import {
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import { Request } from "express";

@Injectable()
export class FileManagerService {
  private s3: S3Client;
  private bucketName: string;
  private region: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>("aws.bucketName") || "";
    this.region = this.configService.get<string>("aws.region") || "";

    this.s3 = new S3Client({
      credentials: {
        accessKeyId: this.configService.get<string>("aws.accessKeyId") || "",
        secretAccessKey:
          this.configService.get<string>("aws.secretAccessKey") || "",
      },
      region: this.region,
    });
  }

  public async uploadFile(
    file: Express.Multer.File,
    existingKey?: string,
  ): Promise<string> {
    if (!this.bucketName) {
      throw new Error("AWS Bucket name is not defined");
    }

    const fileKey = existingKey || randomUUID().replace(/-/g, "");

    const params = {
      Bucket: this.bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    try {
      const uploadResult = await new Upload({
        client: this.s3,
        params,
      }).done();

      if (!uploadResult?.Location) {
        throw new Error("Upload result location is undefined");
      }

      return fileKey;
    } catch (error) {
      console.log(error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  public async getFileStream(
    fileKey: string,
  ): Promise<{ stream: Readable; contentType: string }> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      const response = await this.s3.send(command);

      if (!response.Body) {
        throw new NotFoundException("File not found");
      }

      return {
        stream: response.Body as Readable,
        contentType: response.ContentType || "application/octet-stream",
      };
    } catch (error) {
      throw new NotFoundException(`File not found: ${error.message}`);
    }
  }

  public constructUrl(fileKey: string, req: Request): string {
    return `${req.protocol}://${req.get("host")}/files/${fileKey}`;
  }

  public extractFileKey(url: string): string {
    // Regex to capture public_id before any image extension
    const regex = new RegExp("files/([^/]+)$");
    const match = url.match(regex);

    return match ? match[1] : "";
  }
}
