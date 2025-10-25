import { Module } from "@nestjs/common";
import { HealthController, SimpleHealthController } from "./health.controller";
// import { HealthService } from "./health.service";
// import { QueueModule } from "../../core/queue/queues";

@Module({
  // imports: [QueueModule],
  controllers: [SimpleHealthController],
  // providers: [HealthService],
})
export class HealthModule {}
