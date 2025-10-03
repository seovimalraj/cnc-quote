import { Module } from "@nestjs/common";
import { PricingService } from "./pricing.service";
import { PricingEngineV2Service } from "./pricing-engine-v2.service";
import { PricingController } from "./pricing.controller";
import { PricingGateway } from "./pricing.gateway";
import { PricingPersistenceService } from "./pricing-persistence.service";
import { ValidationService } from "./validation.service";
import { SupabaseModule } from "../../lib/supabase/supabase.module";
import { CacheModule } from "../../lib/cache/cache.module";
import { ManualReviewModule } from "../manual-review/manual-review.module";
import { GeometryModule } from "../geometry/geometry.module";
import { PricingCacheService } from "../../pricing/cache.service";
import { PricingCacheRepository } from "../../pricing/cache.repository";
import { ToleranceCostBookRepository } from "../../pricing/repositories/tolerance-cost-book.repo";
import { ProcessRecommendationService } from "./process-recommendation/process-recommendation.service";
import { ProcessRecommendationController } from "./process-recommendation/process-recommendation.controller";
import { TaxModule } from "../../tax/tax.module";
import { MaterialComparisonService } from "./material-comparison.service";
import { MaterialComparisonController } from "./material-comparison.controller";
import { CatalogModule } from "../catalog/catalog.module";

@Module({
  imports: [SupabaseModule, CacheModule, ManualReviewModule, GeometryModule, TaxModule, CatalogModule],
  controllers: [PricingController, ProcessRecommendationController, MaterialComparisonController],
  providers: [
    PricingService,
    PricingEngineV2Service,
    PricingGateway,
    ValidationService,
    PricingPersistenceService,
    PricingCacheService,
    PricingCacheRepository,
    ToleranceCostBookRepository,
    ProcessRecommendationService,
    MaterialComparisonService,
  ],
  exports: [
    PricingService,
    PricingEngineV2Service,
    ValidationService,
    PricingPersistenceService,
    PricingCacheService,
    PricingCacheRepository,
    ToleranceCostBookRepository,
    ProcessRecommendationService,
  ],
})
export class PricingModule {}
