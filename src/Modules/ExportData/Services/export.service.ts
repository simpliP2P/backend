import { Injectable } from "@nestjs/common";
import { ExportFileType } from "../Enums/export.enum";
import { ExportWorker } from "./export-worker.service";

@Injectable()
export class ExportService {
  constructor(private readonly exportWorker: ExportWorker) {}

  async addExportJob(userId: string, data: any[], fileType: ExportFileType) {
    console.log("Processing export job directly");
    const fileUrl = await this.exportWorker.handleExportJob(
      userId,
      data,
      fileType,
    );
    console.log("Export job processed for user:", userId);
    return fileUrl;
  }
}
