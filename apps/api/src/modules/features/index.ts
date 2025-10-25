/**
 * Business Feature Modules
 * Main business logic and workflows
 */

// Pricing
export { PricingModule } from './pricing/pricing.module';
export { PricingService } from './pricing/pricing.service';

// Design for Manufacturing
export { DfmModule } from './dfm/dfm.module';

// Quote Management
export { QuotesModule } from './quotes/quotes.module';
export { QuotesService } from './quotes/quotes.service';

// Order Processing
export { OrdersModule } from './orders/orders.module';

// Lead Management
export { LeadsModule } from './leads/leads.module';

// AI Services
export { AIModule } from './ai/ai.module';

// Review & Approval
export { ReviewModule } from './review/review.module';
export { ManualReviewModule } from './manual-review/manual-review.module';

// Organization Management
export { OrgsModule } from './orgs/orgs.module';
export { InvitesModule } from './invites/invites.module';

// File Management
export { FilesModule } from './files/files.module';
export { DocumentsModule } from './documents/documents.module';

// Financial
export { PaymentsModule } from './payments/payments.module';
export { FinanceModule } from './finance/finance.module';
export { AccountingModule } from './accounting/accounting.module';

// CAD Processing
export { CadModule } from './cad/cad.module';

// Quality Assurance
export { QapModule } from './qap/qap.module';

// Notifications
export { NotifyModule } from './notify/notify.module';

// PDF Generation
export { PdfModule } from './pdf/pdf.module';

// Routing & Marketplace
export { RoutingModule } from './routing/routing.module';

// Analytics
export { AnalyticsModule } from './analytics/analytics.module';

// Scheduling
export { SchedulerModule } from './scheduler/scheduler.module';
