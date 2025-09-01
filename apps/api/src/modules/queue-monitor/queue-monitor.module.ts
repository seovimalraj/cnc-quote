import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue as BullMQQueue } from 'bullmq';
import { QueueMonitorController } from './queue-monitor.controller';
import { QueueMonitorService } from './queue-monitor.service';
import { QueueMonitorMiddleware } from './queue-monitor.middleware';

const QUEUE_NAMES = ['cad', 'pricing', 'email'] as const;
type QueueName = typeof QUEUE_NAMES[number];

@Module({
  imports: [
    BullModule.registerQueue(
      ...QUEUE_NAMES.map(name => ({ name }))
    ),
  ],
  controllers: [QueueMonitorController],
  providers: [
    QueueMonitorService,
    {
      provide: 'BULL_BOARD',
      useFactory: async (configService: ConfigService) => {
        const serverAdapter = new ExpressAdapter();
        serverAdapter.setBasePath('/admin/queues');

        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisConfig = {
          connection: {
            host: redisHost,
            port: redisPort
          }
        };

        const queues = await Promise.all(
          QUEUE_NAMES.map(async name => {
            const queue = new BullMQQueue(name, redisConfig);
            return new BullMQAdapter(queue);
          })
        );

        const board = createBullBoard({
          queues,
          serverAdapter: serverAdapter as any
        });

        return {
          serverAdapter,
          board
        };
      },
      inject: [ConfigService],
    },
  ],
  exports: ['BULL_BOARD'],
})
export class QueueMonitorModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(QueueMonitorMiddleware)
      .forRoutes('/admin/queues*');
  }
}
