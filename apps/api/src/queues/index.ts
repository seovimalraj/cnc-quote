import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MODEL_LIFECYCLE_QUEUE } from "@cnc-quote/shared";

const QUEUE_NAMES = [
  "cad",
  "pricing",
  "pricing-rationale",
  "admin-pricing-revision-assistant",
  MODEL_LIFECYCLE_QUEUE,
  "email",
  "pdf",
  "qap",
  "dfm-analysis",
  "files",
  "manual-review",
  "compliance-ml-assist",
] as const;

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get("REDIS_HOST"),
          port: configService.get("REDIS_PORT"),
          password: configService.get("REDIS_PASSWORD"),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(...QUEUE_NAMES.map((name) => ({ name }))),
  ],
  exports: [BullModule],
})
export class QueueModule {}
