import { Module } from "@nestjs/common";
import { HealthController, SimpleHealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { BullModule } from "@nestjs/bull";

@Module({
  imports: [BullModule.registerQueue({ name: "cad" }, { name: "pricing" }, { name: "email" })],
  controllers: [HealthController, SimpleHealthController],
  providers: [HealthService],
})
export class HealthModule {}
