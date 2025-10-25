import { Module } from "@nestjs/common";
import { DfmController } from "./dfm.controller";
import { DfmService } from "./dfm.service";
import { DfmAnalysisProcessor } from "../../queues/jobs/dfm-analysis.processor";
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';
import { SupabaseModule } from "../../../lib/supabase/supabase.module";
import { CacheModule } from "../../../lib/cache/cache.module";
import { AdminFeatureFlagsModule } from "../admin/admin/admin-feature-flags/admin-feature-flags.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { GeometryModule } from "../../domain/geometry/geometry.module";
// import { AIModule } from "../ai/ai.module"; // TODO: Check if this is needed

@Module({
  imports: [
    SupabaseModule,
    CacheModule,
    AdminFeatureFlagsModule,
    AnalyticsModule,
    GeometryModule,
    // AIModule, // Temporarily disabled - causes metatype DI error
  ],
  controllers: [DfmController, RiskController],
  providers: [
    DfmService, 
    // DfmAnalysisProcessor, // Temporarily disabled to isolate DI error
    RiskService
  ],
  exports: [DfmService, RiskService],
})
export class DfmModule {}
