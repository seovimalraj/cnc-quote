import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./modules/health/health.module";
import { MachineModule } from "./modules/machines/machine.module";
import { PricingModule } from "./modules/pricing/pricing.module";
import { DfmModule } from "./modules/dfm/dfm.module";
import { LeadsModule } from "./modules/leads/leads.module";
import { SupabaseModule } from "./lib/supabase/supabase.module";
import { CacheModule } from "./lib/cache/cache.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { TestModule } from "./modules/test/test.module";
import { RateLimitModule } from "./lib/rate-limit/rate-limit.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { GeometryModule } from "./modules/geometry/geometry.module";
// NOTE: Additional modules (files, orders, qap, admin, monitoring) intentionally disabled until queue standardization.
import { QueueModule } from "./queues";
import { MetricsModule } from './modules/metrics/metrics.module';
import { QueueMonitorModule } from './modules/queue-monitor/queue-monitor.module';
import { OrgsModule } from './modules/orgs/orgs.module';
import { InvitesModule } from './modules/invites/invites.module';
import { AuditModule } from './audit/audit.module';
import { RbacModule } from './auth/rbac.module';
import { RoutingModule } from './routing/routing.module';
import { LeadtimeModule } from './leadtime/leadtime.module';
import { OutcomesModule } from './quotes/outcomes/outcomes.module';
import { MarginsModule } from './quotes/margins/margins.module';
import { ExportModule } from './quotes/export/export.module';
import { LookupsModule } from './lookups/lookups.module';
import { QuoteRevisionsModule } from './quotes/revisions/revisions.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { RevisionsModule } from './revisions/revisions.module';
import { AIModule } from './modules/ai/ai.module';

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
    SupabaseModule,
    HealthModule,
    TestModule,
    MachineModule,
    PricingModule,
    LeadsModule,
    CatalogModule,
    GeometryModule,
    RateLimitModule,
    CacheModule,
    QueueModule,
    DfmModule,
  PaymentsModule,
  MetricsModule,
  QueueMonitorModule,
  OrgsModule,
  InvitesModule,
  AuditModule,
  RbacModule,
  RoutingModule,
  LeadtimeModule,
  OutcomesModule,
  MarginsModule,
  ExportModule,
  LookupsModule,
  QuoteRevisionsModule,
  SchedulerModule,
  RevisionsModule,
  AIModule,
  ],
})
export class AppModule {}
