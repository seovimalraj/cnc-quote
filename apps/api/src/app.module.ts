import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SupabaseModule } from "./lib/supabase/supabase.module";
import { CacheModule } from "./lib/cache/cache.module";
import { QueueModule } from "./queues";

// Core Infrastructure Modules - Direct Imports
import { AuthModule } from './modules/core/auth/auth.module';
import { RbacModule } from './modules/core/auth/rbac.module';
import { HealthModule } from './modules/core/health/health.module';
import { MetricsModule } from './modules/core/metrics/metrics.module';
import { QueueMonitorModule } from './modules/core/queue-monitor/queue-monitor.module';
import { TestModule } from './modules/core/test/test.module';

// Domain Entity Modules - Direct Imports
import { CatalogModule } from './modules/domain/catalog/catalog.module';
import { GeometryModule } from './modules/domain/geometry/geometry.module';
import { MachineModule } from './modules/domain/machines/machine.module';
import { FinishesModule } from './modules/domain/finishes/finishes.module';
import { LookupsModule } from './modules/domain/lookups/lookups.module';

// Business Feature Modules - Direct Imports
import { PricingModule } from './modules/features/pricing/pricing.module';
import { DfmModule } from './modules/features/dfm/dfm.module';
import { QuotesModule } from './modules/features/quotes/quotes.module';
import { OrdersModule } from './modules/features/orders/orders.module';
import { LeadsModule } from './modules/features/leads/leads.module';
import { AIModule } from './modules/features/ai/ai.module';
import { ReviewModule } from './modules/features/review/review.module';
import { ManualReviewModule } from './modules/features/manual-review/manual-review.module';
import { OrgsModule } from './modules/features/orgs/orgs.module';
import { InvitesModule } from './modules/features/invites/invites.module';
import { FilesModule } from './modules/features/files/files.module';
import { DocumentsModule } from './modules/features/documents/documents.module';
import { PaymentsModule } from './modules/features/payments/payments.module';
import { FinanceModule } from './modules/features/finance/finance.module';
import { AccountingModule } from './modules/features/accounting/accounting.module';
import { CadModule } from './modules/features/cad/cad.module';
import { QapModule } from './modules/features/qap/qap.module';
import { NotifyModule } from './modules/features/notify/notify.module';
import { PdfModule } from './modules/features/pdf/pdf.module';
import { RoutingModule } from './modules/features/routing/routing.module';
import { AnalyticsModule } from './modules/features/analytics/analytics.module';
import { SchedulerModule } from './modules/features/scheduler/scheduler.module';

// Admin Feature Modules - Direct Imports
import { AdminModule } from './modules/admin/admin.module';
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

// Legacy Modules - Direct Imports
import { AuditModule } from './modules/legacy/audit-legacy/audit.module';
import { LeadtimeModule } from './modules/legacy/leadtime-legacy/leadtime.module';
import { QuoteRevisionsModule } from './modules/legacy/quotes-legacy/revisions/revisions.module';
import { OutcomesModule } from './modules/legacy/quotes-legacy/outcomes/outcomes.module';
import { MarginsModule } from './modules/legacy/quotes-legacy/margins/margins.module';
import { ExportModule } from './modules/legacy/quotes-legacy/export/export.module';
import { RevisionsModule } from './modules/legacy/revisions-legacy/revisions.module';
import { PricingCoreModule } from './modules/legacy/pricing-core/pricing-core.module';

@Module({
  imports: [
    // Global Configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    // Global Infrastructure
    SupabaseModule,
    CacheModule,
    QueueModule,

    // Core Infrastructure (no external module dependencies)
    AuthModule,
    RbacModule,
    HealthModule,
    MetricsModule,
    TestModule,

    // Domain Entities (needed by Admin and Features)
    GeometryModule,
    MachineModule,
    FinishesModule,  // Required by AdminModule
    LookupsModule,

    // Legacy Modules (some needed by Features)
    AuditModule,
    LeadtimeModule,
    QuoteRevisionsModule,
    OutcomesModule,
    MarginsModule,
    ExportModule,
    RevisionsModule,
    PricingCoreModule,

    // Admin Features FIRST (some Features depend on these)
    AdminMetricsModule,  // Must come before AdminModule and QueueMonitorModule
    AdminFeatureFlagsModule,  // Required by DfmModule
    AdminModule,         // Depends on FinishesModule and AdminMetricsModule
    AdminUsersModule,
    AdminOrgsModule,
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
    AdminRbacModule,
    AdminSandboxModule,
    AdminSystemModule,

    // Business Features (may depend on Domain, Legacy, and Admin)
    AnalyticsModule,      // Required by DfmModule
    PricingModule,
    DfmModule,            // Depends on AdminFeatureFlagsModule and AnalyticsModule
    QuotesModule,
    OrdersModule,
    LeadsModule,
    AIModule,
    ReviewModule,
    ManualReviewModule,
    OrgsModule,
    InvitesModule,
    FilesModule,
    DocumentsModule,
    PaymentsModule,
    FinanceModule,
    AccountingModule,
    CadModule,
    QapModule,
    NotifyModule,
    PdfModule,
    RoutingModule,
    SchedulerModule,
    
    // QueueMonitorModule depends on AdminMetricsModule, must come last
    QueueMonitorModule,
  ],
})
export class AppModule {}
