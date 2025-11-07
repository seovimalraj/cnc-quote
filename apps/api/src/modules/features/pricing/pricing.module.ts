import { Module, forwardRef } from "@nestjs/common";
import { PricingService } from "./pricing.service";
import { PricingEngineV2Service } from "./pricing-engine-v2.service";
import { PricingController } from "./pricing.controller";
import { PricingGateway } from "./pricing.gateway";
import { PricingPersistenceService } from "./pricing-persistence.service";
import { ValidationService } from "./validation.service";
import { ManualReviewModule } from "../manual-review/manual-review.module";
import { GeometryModule } from "../../domain/geometry/geometry.module";
import { PricingCacheService } from "../../../lib/pricing-core/cache.service";
import { PricingCacheRepository } from "../../../lib/pricing-core/cache.repository";
import { ToleranceCostBookRepository } from "../../../lib/pricing-core/repositories/tolerance-cost-book.repo";
import { ProcessRecommendationService } from "./process-recommendation/process-recommendation.service";
import { ProcessRecommendationController } from "./process-recommendation/process-recommendation.controller";
import { TaxModule } from "../tax/tax.module";
import { MaterialComparisonService } from "./material-comparison.service";
import { MaterialComparisonController } from "./material-comparison.controller";
import { CatalogModule } from "../../domain/catalog/catalog.module";
import { NotifyModule } from "../notify/notify.module";
// PricingConfigService moved to AdminPricingModule to break circular dependency
import { PricingComplianceService } from "./pricing-compliance.service";
import { QueueModule } from "../../../queues";
import { AdminFeatureFlagsModule } from "../../admin/admin-feature-flags/admin-feature-flags.module";
import { AIModule } from "../ai/ai.module";
import { PricingComplianceMlAssistService } from "./pricing-compliance-ml-assist.service";
import { PricingComplianceMlAssistProcessor } from "./pricing-compliance-ml-assist.processor";
import { PricingRationaleSummaryService } from "./pricing-rationale-summary.service";
import { PricingCoreModule } from "../../legacy/pricing-core/pricing-core.module";
// AdminPricingModule REMOVED - causes circular dependency (AdminPricing imports Pricing, Pricing imports AdminPricing)
// PricingEngineV2Service uses @Optional() PricingConfigService, so it works without AdminPricingModule

@Module({
  imports: [
    // SupabaseModule removed - it's @Global
    // CacheModule removed - it's @Global
    ManualReviewModule,
    GeometryModule,
    TaxModule,
    CatalogModule,
    PricingCoreModule, // Import shared pricing infrastructure (includes queue)
    // AdminPricingModule REMOVED - circular dependency broken
    QueueModule,
    NotifyModule,
    AdminFeatureFlagsModule,
    // forwardRef(() => AIModule), // DISABLED - AIModule causes DI error, temporarily disabled
  ],
  controllers: [PricingController, ProcessRecommendationController, MaterialComparisonController],
  providers: [
    PricingService,
    PricingEngineV2Service,
    PricingGateway,
    ValidationService,
    PricingPersistenceService,
    PricingComplianceService,
    PricingComplianceMlAssistService,
    // PricingComplianceMlAssistProcessor, // DISABLED - depends on OllamaService from AIModule
    PricingRationaleSummaryService,
    PricingCacheService,
    PricingCacheRepository,
    ToleranceCostBookRepository,
    ProcessRecommendationService,
    MaterialComparisonService,
    // PricingConfigService moved to AdminPricingModule (imported via AdminPricingModule)
  ],
  exports: [
    PricingService,
    PricingEngineV2Service,
    ValidationService,
    PricingPersistenceService,
    PricingComplianceService,
    PricingComplianceMlAssistService,
    PricingRationaleSummaryService,
    PricingCacheService,
    PricingCacheRepository,
    ToleranceCostBookRepository,
    ProcessRecommendationService,
    // PricingConfigService exported by AdminPricingModule
  ],
})
export class PricingModule {}
