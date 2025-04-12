import { Workbook } from "exceljs";
import { Response } from "express";
import { Parser } from "json2csv";
import * as fs from "fs";
import { join } from "path";
import { FileManagerService } from "src/Modules/FileManager/Services/upload.service";
import { Injectable } from "@nestjs/common";
import { ExportFileType } from "src/Modules/ExportData/Enums/export.enum";

@Injectable()
export class ExportHelper {
  constructor(private readonly fileManageService: FileManagerService) {}

  exportCSV(name: string, data: any[], res: Response, filePath?: string) {
    try {
      const parser = new Parser();
      const csv = parser.parse(data);

      if (filePath) {
        fs.writeFileSync(filePath, csv);
        return;
      }

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${name}.csv"`,
      );
      res.setHeader("Content-Type", "text/csv");
      res.status(200).end(csv);
    } catch (error) {
      console.error("CSV Export Error:", error);
      res.status(500).json({ message: "Failed to export CSV" });
    }
  }

  async exportExcel(
    name: string,
    data: any[],
    res: Response,
    filePath?: string,
  ) {
    try {
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet("Data");
      worksheet.columns = Object.keys(data[0]).map((key) => ({
        header: key,
        key,
      }));

      data.forEach((row) => worksheet.addRow(row));

      if (filePath) {
        await workbook.xlsx.writeFile(filePath);
        return;
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${name}.xlsx"`,
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Excel Export Error:", error);
      res.status(500).json({ message: "Failed to export Excel" });
    }
  }

  exportWord(data: any[], res: Response, filePath?: string) {
    try {
      const content = JSON.stringify(data, null, 2);

      if (filePath) {
        fs.writeFileSync(filePath, content);
        return;
      }

      const tempPath = join(__dirname, "export.docx");
      fs.writeFileSync(tempPath, content);
      res.download(tempPath, "export.docx", () => {
        fs.unlinkSync(tempPath);
      });
    } catch (error) {
      console.error("Word Export Error:", error);
      res.status(500).json({ message: "Failed to export Word document" });
    }
  }

  async exportLargeFileToS3(data: any[], fileType: ExportFileType) {
    const fileName = this.fileManageService.generateFileKey();
    const filePath = join(__dirname, fileName);

    try {
      if (fileType === "csv") {
        this.exportCSV(fileName, data, null as any, filePath);
      } else if (fileType === "excel") {
        await this.exportExcel(fileName, data, null as any, filePath);
      } else if (fileType === "word") {
        this.exportWord(data, null as any, filePath);
      } else {
        throw new Error("Unsupported file type");
      }

      const fileBuffer = fs.readFileSync(filePath);

      await this.fileManageService.uploadFile(
        this.createMockFile(
          fileBuffer,
          fileType === "csv"
            ? "text/csv"
            : fileType === "excel"
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          fileName,
        ),
      );

      fs.unlinkSync(filePath);
      return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/exports/${fileName}`;
    } catch (error) {
      console.error("Error uploading file to S3:", error);
      throw new Error("Failed to upload file");
    }
  }

  private createMockFile(
    buffer: Buffer,
    mimetype: string,
    filename: string,
  ): Express.Multer.File {
    return {
      fieldname: "file",
      originalname: filename,
      encoding: "7bit",
      mimetype,
      buffer,
      size: buffer.length,
    } as Express.Multer.File;
  }
}
