import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { QapService } from "./qap.service";

@Processor("qap")
export class QapProcessor {
  private readonly logger = new Logger(QapProcessor.name);

  constructor(private readonly qapService: QapService) {}

  @Process("generate-pdf")
  async generatePdf(job: Job) {
    try {
      const { documentId, templateHtml, documentData } = job.data;
      await this.qapService.generatePdf(documentId, templateHtml, documentData);
    } catch (error) {
      this.logger.error("Error processing QAP PDF generation:", error);
      throw error;
    }
  }
}
