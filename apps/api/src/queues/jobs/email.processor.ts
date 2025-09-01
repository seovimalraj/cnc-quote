import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job) {
    this.logger.debug(`Processing email job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case 'send':
        return this.sendEmail(job);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  private async sendEmail(job: Job) {
    this.logger.debug(`Sending email from job ${job.id}`);
    // TODO: Implement email sending
    return { status: 'sent' };
  }

  async onError(error: Error): Promise<void> {
    this.logger.error('Email Worker Error:', error);
  }

  async onCompleted(job: Job, result: any): Promise<void> {
    this.logger.debug(`Email Job ${job.id} completed:`, result);
  }

  async onFailed(job: Job, error: Error): Promise<void> {
    this.logger.error(`Email Job ${job.id} failed:`, error);
    
    if (job.attemptsMade >= job.opts.attempts!) {
      this.logger.error(`Email Job ${job.id} has failed all retry attempts`);
    }
  }
}
