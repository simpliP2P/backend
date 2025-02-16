import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ExportFileType } from "../Enums/export.enum";

@Injectable()
export class ExportService {
  constructor(
    @InjectQueue("export-queue") private readonly exportQueue: Queue,
  ) {}

  async addExportJob(userId: string, data: any[], fileType: ExportFileType) {
    console.log("Adding export job to queue");
    const job = await this.exportQueue.add("export-job", {
      userId,
      data,
      fileType,
    });
    console.log("Job added:", job.id);
  }
}
