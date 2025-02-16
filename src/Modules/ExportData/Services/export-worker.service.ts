import { Processor, Process } from "@nestjs/bull";
import { Job } from "bullmq";
import { ExportHelper } from "src/Shared/Helpers/export.helper";

@Processor("export-queue")
export class ExportWorker {
  constructor(private readonly exportHelper: ExportHelper) {
  }

  @Process("export-queue")
  async handleExportJob(job: Job) {
    const { userId, data, fileType } = job.data;
    const fileUrl = await this.exportHelper.exportLargeFileToS3(data, fileType);

    console.log(`✅ Export complete for user ${userId}: ${fileUrl}`);
  }
}
