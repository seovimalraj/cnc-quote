import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, QueueScheduler } from 'bullmq';

@Processor('cad')
export class CadProcessor extends WorkerHost {
  private readonly logger = new Logger(CadProcessor.name);
  private scheduler: QueueScheduler;

  constructor() {
    super({
      // Set high concurrency for CAD processing
      concurrency: 5,
      // Configure backoff strategy for retries
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000, // Initial delay of 1 second
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    });

    // Create scheduler to handle stalled jobs
    this.scheduler = new QueueScheduler('cad', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      stalledInterval: 30000, // Check for stalled jobs every 30 seconds
      maxStalledCount: 2, // Move job back to wait after 2 stalled checks
    });
  }

  async process(job: Job): Promise<any> {
    this.logger.debug(`Processing CAD job ${job.id}: ${job.name}`);

    try {
      // Process the job based on its name
      switch (job.name) {
        case 'analyze':
          return this.processAnalysis(job);
        case 'convert':
          return this.processConversion(job);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(`Error processing CAD job ${job.id}:`, error);
      throw error; // Re-throw to trigger retry mechanism
    }
  }

  private async processAnalysis(job: Job): Promise<any> {
    // Implementation details here...
    return { status: 'completed' };
  }

  private async processConversion(job: Job): Promise<any> {
    // Implementation details here...
    return { status: 'completed' };
  }

  async onError(error: Error): Promise<void> {
    this.logger.error('CAD Worker Error:', error);
  }

  async onCompleted(job: Job, result: any): Promise<void> {
    this.logger.debug(`CAD Job ${job.id} completed:`, result);
  }

  async onFailed(job: Job, error: Error): Promise<void> {
    this.logger.error(`CAD Job ${job.id} failed:`, error);
    
    // Additional failure handling if needed
    if (job.attemptsMade >= job.opts.attempts!) {
      // Job has failed all retry attempts
      this.logger.error(`CAD Job ${job.id} has failed all retry attempts`);
      // Could implement notification or alerting here
    }
  }
}
