import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { QueueModule } from "./queues";
import { HealthModule } from "./modules/health/health.module";
import { MachineModule } from "./modules/machines/machine.module";
import { PricingModule } from "./modules/pricing/pricing.module";
import { DfmModule } from "./modules/dfm/dfm.module";
import { SupabaseModule } from "./lib/supabase/supabase.module";
import { CacheModule } from "./lib/cache/cache.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { NotifyModule } from "./modules/notify/notify.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { QapModule } from "./modules/qap/qap.module";
import { ManualReviewModule } from "./modules/manual-review/manual-review.module";
import { ObservabilityModule } from "./observability/observability.module";
import { TestModule } from "./modules/test/test.module";
import { QueueMonitorModule } from "./modules/queue-monitor/queue-monitor.module";
import { AdminModule } from "./modules/admin/admin.module";
import { ReviewModule } from "./modules/review/review.module";
import { RateLimitModule } from "./lib/rate-limit/rate-limit.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { FilesModule } from "./modules/files/files.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { AdminFilesModule } from "./modules/admin-files/admin-files.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { AdminUsersModule } from "./modules/admin-users/admin-users.module";
import { AdminOrgsModule } from "./modules/admin-orgs/admin-orgs.module";
import { AdminHealthModule } from "./modules/admin-health/admin-health.module";
import { AdminMetricsModule } from "./modules/admin-metrics/admin-metrics.module";
import { AdminErrorsModule } from "./modules/admin-errors/admin-errors.module";
import { AdminAlertsModule } from "./modules/admin-alerts/admin-alerts.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config: Record<string, unknown>) => {
        const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET", "ALLOWED_ORIGINS"];
        for (const envVar of requiredEnvVars) {
          if (!config[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
          }
        }
        return config;
      },
    }),
    RateLimitModule,
    SupabaseModule,
    CacheModule,
    AuthModule,
    QueueModule,
    ObservabilityModule,
    HealthModule,
    MachineModule,
    PricingModule,
    DfmModule,
    PaymentsModule,
    NotifyModule,
    OrdersModule,
    QapModule,
    ManualReviewModule,
    TestModule,
    QueueMonitorModule,
    AdminModule,
    ReviewModule,
    DocumentsModule,
    FilesModule,
    CatalogModule,
    AdminFilesModule,
    FinanceModule,
    AdminUsersModule,
    AdminOrgsModule,
    AdminHealthModule,
    AdminMetricsModule,
    AdminErrorsModule,
    AdminAlertsModule,
  ],
})
export class AppModule {}
