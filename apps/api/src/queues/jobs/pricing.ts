import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bullmq';

@Processor('pricing')
export class PricingProcessor {
  @Process('calculate')
  async calculate(job: Job) {
    // TODO: Implement pricing calculation
    return { status: 'processed' };
  }
}
