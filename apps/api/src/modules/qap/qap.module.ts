import { Module } from "@nestjs/common";
import { QapService } from "./qap.service";
import { QapController } from "./qap.controller";
import { QapProcessor } from "./qap.processor";
import { BullModule } from "@nestjs/bull";
import { QueueModule } from "../../queues";

@Module({
  imports: [QueueModule],
  providers: [QapService, QapProcessor],
  controllers: [QapController],
  exports: [QapService],
})
export class QapModule {}
