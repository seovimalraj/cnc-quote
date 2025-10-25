/**
 * Legacy Modules
 * Older implementations maintained for backward compatibility
 */

// Audit System (Legacy)
export { AuditModule } from './audit-legacy/audit.module';
export { AuditService } from './audit-legacy/audit.service';

// Lead Time Calculation (Legacy)
export { LeadtimeModule } from './leadtime-legacy/leadtime.module';

// Quote System (Legacy)
export { QuoteRevisionsModule } from './quotes-legacy/revisions/revisions.module';
export { OutcomesModule } from './quotes-legacy/outcomes/outcomes.module';
export { MarginsModule } from './quotes-legacy/margins/margins.module';
export { ExportModule } from './quotes-legacy/export/export.module';

// Revision System (Legacy)
export { RevisionsModule } from './revisions-legacy/revisions.module';

// Pricing Core (Legacy - moved to lib/)
export { PricingCoreModule } from './pricing-core/pricing-core.module';
