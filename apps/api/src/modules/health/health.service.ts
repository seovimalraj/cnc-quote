import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';

@Injectable()
export class HealthService {
  constructor(
    @InjectQueue('cad') private readonly cadQueue: Queue,
    @InjectQueue('pricing') private readonly pricingQueue: Queue,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  async check() {
    const [cadCount, pricingCount, emailCount] = await Promise.all([
      this.cadQueue.getJobCounts(),
      this.pricingQueue.getJobCounts(),
      this.emailQueue.getJobCounts(),
    ]);

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      queues: {
        cad: cadCount,
        pricing: pricingCount,
        email: emailCount,
      },
    };
  }
}
