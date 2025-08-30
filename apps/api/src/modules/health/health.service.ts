import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';

// Using require because the package.json is outside the TypeScript source tree
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../../../package.json');

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
      ok: true,
      service: 'api',
      version: packageJson.version,
      timestamp: new Date().toISOString(),
      details: {
        queues: {
          cad: cadCount,
          pricing: pricingCount,
          email: emailCount,
        }
      }
    };
  }
}
