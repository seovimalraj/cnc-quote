import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from "@nestjs/terminus";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Monitoring")
@Controller("monitoring")
export class MonitoringController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get("health")
  @HealthCheck()
  check() {
    return this.health.check([
      // HTTP endpoints health
      () => this.http.pingCheck("web-app", "https://cnc-quote-web.onrender.com/api/health"),
      () => this.http.pingCheck("cad-service", "https://cnc-quote-cad.onrender.com/api/health"),

      // System health
      () => this.disk.checkStorage("storage", { path: "/", thresholdPercent: 0.9 }),
      () => this.memory.checkHeap("memory_heap", 300 * 1024 * 1024), // 300MB
      () => this.memory.checkRSS("memory_rss", 300 * 1024 * 1024), // 300MB
    ]);
  }
}
