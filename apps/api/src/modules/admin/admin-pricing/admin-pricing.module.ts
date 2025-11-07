import { Module, forwardRef } from '@nestjs/common';
import { AdminPricingController } from './admin-pricing.controller';
import { AdminPricingService } from './admin-pricing.service';
import { PricingConfigService } from './pricing-config.service';
import { PricingModule } from "../../features/pricing/pricing.module";

@Module({
  imports: [
    // SupabaseModule removed - it's @Global
    // CacheModule removed - it's @Global
    // PricingModule removed - AdminPricingModule should not depend on PricingModule
    // Admin modules should be independent, PricingModule can import AdminPricingModule if needed
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
