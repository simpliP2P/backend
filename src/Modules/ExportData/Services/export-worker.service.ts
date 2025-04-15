import { Injectable } from "@nestjs/common";
import { ExportHelper } from "src/Shared/Helpers/export.helper";
import { ExportFileType } from "../Enums/export.enum";

@Injectable()
export class ExportWorker {
  constructor(private readonly exportHelper: ExportHelper) {}

  async handleExportJob(userId: string, data: any[], fileType: ExportFileType) {
    const fileUrl = await this.exportHelper.exportLargeFileToS3(data, fileType);
    console.log(`✅ Export complete for user ${userId}: ${fileUrl}`);
    return fileUrl;
  }
}
