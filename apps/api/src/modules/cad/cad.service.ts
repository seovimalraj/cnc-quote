import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { HttpService } from "@nestjs/axios";
import { FilesService } from "../files/files.service";
import { firstValueFrom } from "rxjs";
import { FileNotFoundError, FileNotReadyError, CadServiceError } from "./cad.errors";
import { CadAnalysisResult, CadJobData, CadJobType, CadPreviewResult, CadTaskStatus } from "./cad.types";
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
    const downloadUrl = await this.filesService.getSignedUrl(fileId);

    // Queue analysis task
    try {
      const job = await this.cadQueue.add(
        "analyze" as CadJobType,
        {
          fileId,
          downloadUrl: downloadUrl,
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
        this.httpService.get<CadAnalysisResult>(`${this.CAD_SERVICE_URL}/analyze/${taskId}`),
      );
      return data;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 202) {
          return {
            task_id: taskId,
            file_id: '',
            status: "Processing" as const,
            processing_started_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
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
      const downloadUrl = await this.filesService.getSignedUrl(fileId);

      // Request GLTF conversion
      const { data: conversionRequest } = await firstValueFrom(
        this.httpService.post(`${this.CAD_SERVICE_URL}/gltf/${fileId}`, {
          file_path: downloadUrl,
        }),
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
          },
        },
      );
      this.logger.debug(`Preview generation queued successfully for file ${fileId} with task ${job.id}`);
      return { taskId: job.id };
    } catch (error) {
      this.logger.error(`Failed to queue preview generation for file ${fileId}:`, error);
      throw new CadServiceError("Failed to queue preview generation");
    }
  }

  async getPreviewData(
    fileId: string,
    format: 'gltf' | 'obj' | 'stl' = 'gltf',
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<CadPreviewResult> {
    this.logger.debug(`Fetching preview data for file ${fileId} (format: ${format}, quality: ${quality})`);

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<CadPreviewResult>(
          `${this.CAD_SERVICE_URL}/preview/${fileId}`,
          {
            params: { format, quality }
          }
        ),
      );
      return data;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 202) {
          return {
            task_id: '',
            file_id: fileId,
            status: 'Processing',
            format,
            quality,
            processing_started_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        if (error.response?.status === 404) {
          throw new FileNotFoundError(fileId);
        }
      }
      this.logger.error(`Failed to get preview data for file ${fileId}:`, error);
      throw new CadServiceError("Failed to get preview data");
    }
  }

  async getTaskStatus(taskId: string): Promise<CadTaskStatus> {
    this.logger.debug(`Fetching task status for task ${taskId}`);

    try {
      // Try to get job from queue first
      const job = await this.cadQueue.getJob(taskId);

      if (!job) {
        // If not in queue, check with CAD service
        const { data } = await firstValueFrom(
          this.httpService.get<CadTaskStatus>(`${this.CAD_SERVICE_URL}/task/${taskId}/status`),
        );
        return data;
      }

      // Return queue job status
      const state = await job.getState();
      const progress = job.progress as number || 0;

      return {
        task_id: taskId,
        status: this.mapQueueStateToCadStatus(state),
        progress,
        message: `Task is ${state}`,
        estimated_completion: job.opts.delay ? new Date(Date.now() + job.opts.delay).toISOString() : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get task status for task ${taskId}:`, error);
      throw new CadServiceError("Failed to get task status");
    }
  }

  private mapQueueStateToCadStatus(state: string): 'Queued' | 'Processing' | 'Succeeded' | 'Failed' {
    switch (state) {
      case 'waiting':
      case 'delayed':
        return 'Queued';
      case 'active':
        return 'Processing';
      case 'completed':
        return 'Succeeded';
      case 'failed':
        return 'Failed';
      default:
        return 'Queued';
    }
  }
}
