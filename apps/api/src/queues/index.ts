import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";

const QUEUE_NAMES = ["cad", "pricing", "email"] as const;

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
