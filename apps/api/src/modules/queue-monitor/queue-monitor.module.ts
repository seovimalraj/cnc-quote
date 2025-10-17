import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Queue as BullMQQueue } from "bullmq";
import { QueueMonitorController } from "./queue-monitor.controller";
import { QueueMonitorService } from "./queue-monitor.service";
import { QueueStatusGateway } from "./queue-status.gateway";
import { QueueMonitorMiddleware } from "./queue-monitor.middleware";
import { QueueModule } from "../../queues";
import { AdminMetricsModule } from '../admin-metrics/admin-metrics.module';
import { SupabaseModule } from '../../lib/supabase/supabase.module';
import { AdminModule } from '../admin/admin.module';

const QUEUE_NAMES = ["cad", "pricing", "email", "pdf"] as const;
type _QueueName = (typeof QUEUE_NAMES)[number];

@Module({
  imports: [QueueModule, AdminMetricsModule, SupabaseModule, AdminModule],
  controllers: [QueueMonitorController],
  providers: [
  QueueMonitorService,
  QueueStatusGateway,
    {
      provide: "BULL_BOARD",
      useFactory: async (configService: ConfigService) => {
        const serverAdapter = new ExpressAdapter();
        serverAdapter.setBasePath("/admin/queues");

        const redisHost = configService.get<string>("REDIS_HOST", "localhost");
        const redisPort = configService.get<number>("REDIS_PORT", 6379);
        const redisConfig = {
          connection: {
            host: redisHost,
            port: redisPort,
          },
        };

        const queues = await Promise.all(
          QUEUE_NAMES.map(async (name) => {
            const queue = new BullMQQueue(name, redisConfig);
            return new BullMQAdapter(queue);
          }),
        );

        const board = createBullBoard({ queues, serverAdapter });

        return {
          serverAdapter,
          board,
        };
      },
      inject: [ConfigService],
    },
  ],
  exports: ["BULL_BOARD"],
})
export class QueueMonitorModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(QueueMonitorMiddleware).forRoutes("/admin/queues*");
  }
}
