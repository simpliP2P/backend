import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Upload } from "@aws-sdk/lib-storage";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"; // Import the presigner
import { randomUUID } from "crypto";
import { Readable } from "stream";
import { Request } from "express";

@Injectable()
export class FileManagerService {
  private s3: S3Client;
  private bucketName: string;
  private region: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.getOrThrow<string>("aws.bucketName")!;
    this.region = this.configService.getOrThrow<string>("aws.region")!;

    this.s3 = new S3Client({
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>("aws.accessKeyId")!,
        secretAccessKey: this.configService.getOrThrow<string>(
          "aws.secretAccessKey",
        )!,
      },
      region: this.region,
    });
  }

  public async uploadFile(
    file: Express.Multer.File,
    existingKey?: string,
  ): Promise<string> {
    const fileKey = existingKey || this.generateFileKey();

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

  public async getSignedUrl(
    fileKey: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      // Generate a pre-signed URL that expires in `expiresIn` seconds (default: 1 hour)
      const signedUrl = await getSignedUrl(this.s3, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  public constructUrl(fileKey: string, req: Request): string {
    return `${req.protocol}://${req.get("host")}/files/${fileKey}`;
  }

  public generateFileKey() {
    return randomUUID().replace(/-/g, "");
  }

  public extractFileKey(url: string): string {
    // Regex to capture public_id before any image extension
    const regex = new RegExp("files/([^/]+)$");
    const match = url.match(regex);

    return match ? match[1] : "";
  }
}
