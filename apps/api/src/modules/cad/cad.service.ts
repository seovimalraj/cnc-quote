import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { HttpService } from "@nestjs/axios";
import { FilesService } from "../files/files.service";
import { firstValueFrom } from "rxjs";
import { FileNotFoundError, FileNotReadyError, CadServiceError } from "./cad.errors";
import { CadAnalysisResult, CadJobData, CadJobType } from "./cad.types";
import { ConfigService } from "@nestjs/config";
import { AxiosError } from "axios";

@Injectable()
export class CadService {
  private readonly logger = new Logger(CadService.name);
  private readonly CAD_SERVICE_URL: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly filesService: FilesService,
    private readonly configService: ConfigService,
    @InjectQueue("cad") private readonly cadQueue: Queue,
  ) {
    this.CAD_SERVICE_URL = this.configService.get<string>("CAD_SERVICE_URL", "http://cad-service:8000");
  }

  async queueAnalysis(fileId: string, userId: string): Promise<{ taskId: string }> {
    this.logger.debug(`Queueing analysis for file ${fileId} (user: ${userId})`);

    const file = await this.filesService.getFile(fileId, userId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }

    if (file.status !== "clean") {
      throw new FileNotReadyError(fileId, file.status);
    }

    // Get download URL for CAD service
    const { url: downloadUrl } = await this.filesService.getDownloadUrl(fileId, userId);

    // Queue analysis task
    try {
      const job = await this.cadQueue.add(
        "analyze" as CadJobType,
        {
          fileId,
          downloadUrl: downloadUrl.signedUrl,
        } as CadJobData,
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      );

      this.logger.debug(`Analysis queued successfully for file ${fileId} with task ${job.id}`);
      return { taskId: job.id };
    } catch (error) {
      this.logger.error(`Failed to queue analysis for file ${fileId}:`, error);
      throw new CadServiceError("Failed to queue analysis task");
    }
  }

  async getAnalysisResult(taskId: string): Promise<CadAnalysisResult> {
    this.logger.debug(`Fetching analysis result for task ${taskId}`);
    
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<CadAnalysisResult>(`${this.CAD_SERVICE_URL}/analyze/${taskId}`)
      );
      return data;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 202) {
          return { status: "processing" };
        }
        if (error.response?.status === 404) {
          throw new FileNotFoundError(taskId);
        }
      }
      this.logger.error(`Failed to get analysis result for task ${taskId}:`, error);
      throw new CadServiceError("Failed to get analysis result");
    }
  }

  async getPreview(fileId: string, userId: string): Promise<{ taskId: string }> {
    this.logger.debug(`Queueing preview generation for file ${fileId} (user: ${userId})`);

    const file = await this.filesService.getFile(fileId, userId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }

    if (file.status !== "clean") {
      throw new FileNotReadyError(fileId, file.status);
    }

    try {
      // Get download URL
      const { url: downloadUrl } = await this.filesService.getDownloadUrl(fileId, userId);

      // Request GLTF conversion
      const { data: conversionRequest } = await firstValueFrom(
        this.httpService.post(`${this.CAD_SERVICE_URL}/gltf/${fileId}`, {
          file_path: downloadUrl,
        })
      );

      // Queue preview generation
    const job = await this.cadQueue.add(
      "preview" as CadJobType,
      {
        fileId,
        taskId: conversionRequest.task_id,
      } as CadJobData,
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        }
      }
    );      this.logger.debug(`Preview generation queued successfully for file ${fileId} with task ${job.id}`);
      return { taskId: job.id };
    } catch (error) {
      this.logger.error(`Failed to queue preview generation for file ${fileId}:`, error);
      throw new CadServiceError("Failed to queue preview generation");
    }
  }
}
