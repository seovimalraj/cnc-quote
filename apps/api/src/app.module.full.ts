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
import { MetricsModule } from './modules/core/metrics/metrics.module';
import { QueueMonitorModule } from './modules/core/queue-monitor/queue-monitor.module';
import { OrgsModule } from './modules/features/orgs/orgs.module';
import { InvitesModule } from './modules/features/invites/invites.module';
import { AuditModule } from './modules/legacy/audit-legacy/audit.module';
import { RbacModule } from './modules/core/auth/rbac.module';
import { RoutingModule } from './modules/features/routing/routing.module';
import { LeadtimeModule } from './modules/legacy/leadtime-legacy/leadtime.module';
import { OutcomesModule } from './modules/legacy/quotes-legacy/outcomes/outcomes.module';
import { MarginsModule } from './modules/legacy/quotes-legacy/margins/margins.module';
import { ExportModule } from './modules/legacy/quotes-legacy/export/export.module';
import { LookupsModule } from './modules/domain/lookups/lookups.module';
import { QuoteRevisionsModule } from './modules/legacy/quotes-legacy/revisions/revisions.module';
import { SchedulerModule } from './modules/features/scheduler/scheduler.module';
import { RevisionsModule } from './modules/legacy/revisions-legacy/revisions.module';
import { AIModule } from './modules/features/ai/ai.module';
import { ReviewModule } from './modules/features/review/review.module';
import { AdminModule } from './modules/admin/admin/admin.module';
import { AdminUsersModule } from './modules/admin/admin-users/admin-users.module';
import { AdminOrgsModule } from './modules/admin/admin-orgs/admin-orgs.module';
import { AdminFeatureFlagsModule } from './modules/admin/admin-feature-flags/admin-feature-flags.module';
import { AdminSettingsModule } from './modules/admin/admin-settings/admin-settings.module';
import { AdminPricingModule } from './modules/admin/admin-pricing/admin-pricing.module';
import { AdminContentModule } from './modules/admin/admin-content/admin-content.module';
import { AdminAlertsModule } from './modules/admin/admin-alerts/admin-alerts.module';
import { AdminApiKeysModule } from './modules/admin/admin-api-keys/admin-api-keys.module';
import { AdminBrandingModule } from './modules/admin/admin-branding/admin-branding.module';
import { AdminComplianceModule } from './modules/admin/admin-compliance/admin-compliance.module';
import { AdminDevModule } from './modules/admin/admin-dev/admin-dev.module';
import { AdminDfmModule } from './modules/admin/admin-dfm/admin-dfm.module';
import { AdminErrorsModule } from './modules/admin/admin-errors/admin-errors.module';
import { AdminFilesModule } from './modules/admin/admin-files/admin-files.module';
import { AdminHealthModule } from './modules/admin/admin-health/admin-health.module';
import { AdminMetricsModule } from './modules/admin/admin-metrics/admin-metrics.module';
import { AdminRbacModule } from './modules/admin/admin-rbac/admin-rbac.module';
import { AdminSandboxModule } from './modules/admin/admin-sandbox/admin-sandbox.module';
import { AdminSystemModule } from './modules/admin/admin-system/admin-system.module';
import { AccountingModule } from './modules/features/accounting/accounting.module';
import { AnalyticsModule } from './modules/features/analytics/analytics.module';
import { AuthModule } from './modules/core/auth/auth.module';
import { CadModule } from './modules/features/cad/cad.module';
import { DocumentsModule } from './modules/features/documents/documents.module';
import { FilesModule } from './modules/features/files/files.module';
import { FinanceModule } from './modules/features/finance/finance.module';
import { FinishesModule } from './modules/domain/finishes/finishes.module';
import { ManualReviewModule } from './modules/features/manual-review/manual-review.module';
import { NotifyModule } from './modules/features/notify/notify.module';
import { OrdersModule } from './modules/features/orders/orders.module';
import { PdfModule } from './modules/features/pdf/pdf.module';
import { QapModule } from './modules/features/qap/qap.module';
import { QuotesModule } from './modules/features/quotes/quotes.module';

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
