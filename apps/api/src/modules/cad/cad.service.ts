import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { HttpService } from '@nestjs/axios';
import { FilesService } from '../files/files.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CadService {
  private readonly logger = new Logger(CadService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly filesService: FilesService,
    @InjectQueue('cad') private readonly cadQueue: Queue,
  ) {}

  private readonly CAD_SERVICE_URL = process.env.CAD_SERVICE_URL || 'http://cad-service:8000';

  async queueAnalysis(fileId: string, userId: string) {
    const file = await this.filesService.getFile(fileId, userId);
    if (!file) {
      throw new Error('File not found');
    }

    if (file.status !== 'clean') {
      throw new Error('File is not ready for analysis');
    }

    // Get download URL for CAD service
    const { url: downloadUrl } = await this.filesService.getDownloadUrl(fileId, userId);

    // Queue analysis task
    const job = await this.cadQueue.add(
      'analyze',
      {
        fileId,
        downloadUrl,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    return { taskId: job.id };
  }

  async getAnalysisResult(taskId: string) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.CAD_SERVICE_URL}/analyze/${taskId}`)
      );
      return data;
    } catch (error) {
      if (error.response?.status === 202) {
        return { status: 'processing' };
      }
      throw error;
    }
  }

  async getPreview(fileId: string, userId: string) {
    const file = await this.filesService.getFile(fileId, userId);
    if (!file) {
      throw new Error('File not found');
    }

    if (file.status !== 'clean') {
      throw new Error('File is not ready for preview');
    }

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
      'preview',
      {
        fileId,
        taskId: conversionRequest.task_id,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    return { taskId: job.id };
  }
}
