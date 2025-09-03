import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { CadJobData } from "./cad.types";
import {
  CadAnalysisJobResult,
  CadConversionJobResult,
  CadJobResult,
  CadConversionJobData,
} from "./cad.processor.types";

@Processor("cad")
export class CadProcessor extends WorkerHost {
  private readonly logger = new Logger(CadProcessor.name);

  async process(job: Job<CadJobData>): Promise<CadJobResult> {
    this.logger.debug(`Processing CAD job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case "analyze":
        return this.processAnalysis(job);
      case "preview":
        return this.processPreview(job);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  async onError(error: Error): Promise<void> {
    this.logger.error("CAD Worker Error:", error);
  }

  async onCompleted(job: Job<CadJobData>, result: CadJobResult): Promise<void> {
    this.logger.debug(`CAD Job ${job.id} completed:`, result);
  }

  async onFailed(job: Job<CadJobData>, error: Error): Promise<void> {
    this.logger.error(`CAD Job ${job.id} failed:`, error);

    if (job.attemptsMade >= job.opts.attempts!) {
      this.logger.error(`CAD Job ${job.id} has failed all retry attempts`);
    }
  }

  private async processAnalysis(job: Job<CadJobData>): Promise<CadAnalysisJobResult> {
    this.logger.debug(`Processing CAD analysis job ${job.id}`);

    try {
      // TODO: Implement CAD file analysis
      // Extract metadata like:
      // - Part dimensions
      // - Features (holes, pockets, etc.)
      // - Material requirements
      // - Estimated machining time
      return {
        status: "analyzed",
        dimensions: {
          x: 100,
          y: 200,
          z: 50,
        },
        features: {
          holes: 4,
          pockets: 2,
        },
        estimatedMachiningTime: 120, // minutes
      };
    } catch (error) {
      this.logger.error(`Failed to process CAD analysis job ${job.id}:`, error);
      throw error;
    }
  }

  private async processPreview(job: Job<CadJobData>): Promise<CadConversionJobResult> {
    this.logger.debug(`Processing CAD preview job ${job.id}`);

    try {
      // Generate GLTF preview for the CAD file
      return {
        status: "converted",
        outputFormat: "gltf",
        outputPath: `/tmp/previews/${job.id}.gltf`,
      };
    } catch (error) {
      this.logger.error(`Failed to process CAD preview job ${job.id}:`, error);
      throw error;
    }
  }

  // Keep this method for compatibility but it's not directly used in the main process method
  private async processConversion(job: Job<CadConversionJobData>): Promise<CadConversionJobResult> {
    this.logger.debug(`Processing CAD conversion job ${job.id}`);

    try {
      // TODO: Implement CAD file conversion
      // Support conversions between:
      // - STEP <-> STL
      // - STEP <-> OBJ
      // - STEP <-> IGES
      return {
        status: "converted",
        outputFormat: job.data.targetFormat,
        outputPath: `/tmp/converted/${job.id}.${job.data.targetFormat.toLowerCase()}`,
      };
    } catch (error) {
      this.logger.error(`Failed to process CAD conversion job ${job.id}:`, error);
      throw error;
    }
  }
}
