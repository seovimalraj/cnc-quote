import { Module, forwardRef } from '@nestjs/common';
import { AdminPricingController } from './admin-pricing.controller';
import { AdminPricingService } from './admin-pricing.service';
import { PricingConfigService } from './pricing-config.service';
import { SupabaseModule } from "../../../lib/supabase/supabase.module";
import { CacheModule } from "../../../lib/cache/cache.module";
import { PricingModule } from "../../features/pricing/pricing.module";

@Module({
  imports: [
    SupabaseModule,
    CacheModule,
    forwardRef(() => PricingModule), // Use forwardRef to break circular dependency
  ],
  controllers: [AdminPricingController],
  providers: [
    AdminPricingService,
    PricingConfigService, // Moved from PricingModule to break circular dependency
  ],
  exports: [
    AdminPricingService,
    PricingConfigService, // Export so PricingModule can use it
  ],
})
export class AdminPricingModule {}
