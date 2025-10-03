import { Test, TestingModule } from '@nestjs/testing';
import { QueueMonitorService } from '../../src/modules/queue-monitor/queue-monitor.service';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { Queue } from 'bullmq';

// Simple in-memory Redis not provided; this test expects a Redis instance reachable at REDIS_HOST/PORT.
// If not present, it will be skipped gracefully.
const requiredEnv = ['REDIS_HOST', 'REDIS_PORT'];
const hasRedis = requiredEnv.every((v) => process.env[v]);

describe('QueueMonitorService (smoke)', () => {
  if (!hasRedis) {
    it('skipped (no redis env)', () => {
      expect(true).toBe(true);
    });
    return;
  }

  let moduleRef: TestingModule;
  let service: QueueMonitorService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        BullModule.forRoot({
          connection: {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
          },
        }),
        BullModule.registerQueue(
          { name: 'cad' },
          { name: 'pricing' },
          { name: 'email' },
          { name: 'pdf' },
          { name: 'qap' },
          { name: 'files' },
        ),
      ],
      providers: [
        QueueMonitorService,
        { provide: 'cadQueue', useExisting: Queue },
      ],
    }).compile();

    service = moduleRef.get(QueueMonitorService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('returns queue counts object', async () => {
    const counts = await service.getQueueCounts();
    expect(counts).toHaveProperty('cad');
    expect(counts).toHaveProperty('pricing');
  });

  it('returns metrics with health', async () => {
    const metrics = await service.getQueueMetrics();
    expect(metrics).toHaveProperty('queues');
  });
});
