import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt.guard";
import { OrgGuard } from "../../auth/org.guard";
import { QueueMonitorService } from "./queue-monitor.service";

@ApiTags("Queue Monitor")
@Controller("admin/queues")
@UseGuards(JwtAuthGuard, OrgGuard)
@ApiBearerAuth()
export class QueueMonitorController {
  constructor(private readonly queueMonitorService: QueueMonitorService) {}

  @Get("metrics")
  async getQueueMetrics() {
    return this.queueMonitorService.getQueueMetrics();
  }

  @Get("counts")
  async getQueueCounts() {
    return this.queueMonitorService.getQueueCounts();
  }
}
