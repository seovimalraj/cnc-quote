import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { QueueMonitorController } from './queue-monitor.controller';
import { QueueMonitorService } from './queue-monitor.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'cad' },
      { name: 'pricing' },
      { name: 'email' }
    ),
  ],
  controllers: [QueueMonitorController],
  providers: [
    QueueMonitorService,
    {
      provide: 'BULL_BOARD',
      useFactory: async (configService: ConfigService) => {
        const serverAdapter = new ExpressAdapter();
        
        // Create Queue instances
        const redisUrl = configService.get<string>('REDIS_URL');
        const queues = ['cad', 'pricing', 'email'].map(
          name => new Queue(name, { connection: { url: redisUrl } })
        );
        
        createBullBoard({
          queues: queues.map(queue => new BullAdapter(queue)),
          serverAdapter,
        });

        // Configure route base path
        serverAdapter.setBasePath('/admin/queues');
        
        return serverAdapter;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['BULL_BOARD'],
})
export class QueueMonitorModule {}
