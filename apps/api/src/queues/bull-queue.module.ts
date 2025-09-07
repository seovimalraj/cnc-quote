import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get("REDIS_URL"),
          // Fallback to individual connection params if URL not provided
          host: configService.get("REDIS_HOST", "localhost"),
          port: parseInt(configService.get("REDIS_PORT", "6379")),
          password: configService.get("REDIS_PASSWORD"),
        },
      }),
    }),
    BullModule.registerQueue({
      name: "cad",
      prefix: "cnc-quote",
    }),
    BullModule.registerQueue({
      name: "dfm-analysis",
      prefix: "cnc-quote",
    }),
  ],
  exports: [BullModule],
})
export class BullQueueModule {}
