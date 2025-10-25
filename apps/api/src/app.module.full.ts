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
// All modules enabled and registered (files, orders, qap, admin, monitoring, etc.)
import { QueueModule } from "./queues";
import { MetricsModule } from './modules/metrics/metrics.module';
import { QueueMonitorModule } from './modules/queue-monitor/queue-monitor.module';
import { OrgsModule } from './modules/orgs/orgs.module';
import { InvitesModule } from './modules/invites/invites.module';
import { AuditModule } from './modules/audit-legacy/audit.module';
import { RbacModule } from './modules/auth/rbac.module';
import { RoutingModule } from './modules/routing/routing.module';
import { LeadtimeModule } from './modules/leadtime-legacy/leadtime.module';
import { OutcomesModule } from './modules/quotes-legacy/outcomes/outcomes.module';
import { MarginsModule } from './modules/quotes-legacy/margins/margins.module';
import { ExportModule } from './modules/quotes-legacy/export/export.module';
import { LookupsModule } from './modules/lookups/lookups.module';
import { QuoteRevisionsModule } from './modules/quotes-legacy/revisions/revisions.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { RevisionsModule } from './modules/revisions-legacy/revisions.module';
import { AIModule } from './modules/ai/ai.module';
import { ReviewModule } from './modules/review/review.module';
import { AdminModule } from './modules/admin/admin.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { AdminOrgsModule } from './modules/admin-orgs/admin-orgs.module';
import { AdminFeatureFlagsModule } from './modules/admin-feature-flags/admin-feature-flags.module';
import { AdminSettingsModule } from './modules/admin-settings/admin-settings.module';
import { AdminPricingModule } from './modules/admin-pricing/admin-pricing.module';
import { AdminContentModule } from './modules/admin-content/admin-content.module';
import { AdminAlertsModule } from './modules/admin-alerts/admin-alerts.module';
import { AdminApiKeysModule } from './modules/admin-api-keys/admin-api-keys.module';
import { AdminBrandingModule } from './modules/admin-branding/admin-branding.module';
import { AdminComplianceModule } from './modules/admin-compliance/admin-compliance.module';
import { AdminDevModule } from './modules/admin-dev/admin-dev.module';
import { AdminDfmModule } from './modules/admin-dfm/admin-dfm.module';
import { AdminErrorsModule } from './modules/admin-errors/admin-errors.module';
import { AdminFilesModule } from './modules/admin-files/admin-files.module';
import { AdminHealthModule } from './modules/admin-health/admin-health.module';
import { AdminMetricsModule } from './modules/admin-metrics/admin-metrics.module';
import { AdminRbacModule } from './modules/admin-rbac/admin-rbac.module';
import { AdminSandboxModule } from './modules/admin-sandbox/admin-sandbox.module';
import { AdminSystemModule } from './modules/admin-system/admin-system.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { CadModule } from './modules/cad/cad.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { FilesModule } from './modules/files/files.module';
import { FinanceModule } from './modules/finance/finance.module';
import { FinishesModule } from './modules/finishes/finishes.module';
import { ManualReviewModule } from './modules/manual-review/manual-review.module';
import { NotifyModule } from './modules/notify/notify.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { QapModule } from './modules/qap/qap.module';
import { QuotesModule } from './modules/quotes/quotes.module';

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
    // PricingModule, // DEBUG
    // LeadsModule, // DEBUG  
    // CatalogModule, // DEBUG
    // GeometryModule, // DEBUG
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
    ReviewModule,
    AdminModule,
    AdminUsersModule,
    AdminOrgsModule,
    AdminFeatureFlagsModule,
    AdminSettingsModule,
    AdminPricingModule,
    AdminContentModule,
    AdminAlertsModule,
    AdminApiKeysModule,
    AdminBrandingModule,
    AdminComplianceModule,
    AdminDevModule,
    AdminDfmModule,
    AdminErrorsModule,
    AdminFilesModule,
    AdminHealthModule,
    AdminMetricsModule,
    AdminRbacModule,
    AdminSandboxModule,
    AdminSystemModule,
    AccountingModule,
    AnalyticsModule,
    AuthModule,
    // CadModule, // Temporarily disabled - dependency issue
    DocumentsModule,
    FilesModule,
    FinanceModule,
    FinishesModule,
    ManualReviewModule,
    NotifyModule,
    OrdersModule,
    PdfModule,
    QapModule,
    QuotesModule,
  ],
})
export class AppModule {}
