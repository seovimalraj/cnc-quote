import { Module } from '@nestjs/common';
import { AdminPricingController } from './admin-pricing.controller';
import { AdminPricingService } from './admin-pricing.service';
import { SupabaseModule } from '../../lib/supabase/supabase.module';
import { CacheModule } from '../../lib/cache/cache.module';
import { QueueModule } from '../../queues';
import { AdminFeatureFlagsModule } from '../admin-feature-flags/admin-feature-flags.module';
import { AdminPricingRevisionController } from './admin-pricing-revision.controller';
import { AdminPricingRevisionAssistantService } from './admin-pricing-revision-assistant.service';
import { AdminPricingRevisionThrottleGuard } from './admin-pricing-revision.throttle.guard';

@Module({
  imports: [SupabaseModule, CacheModule, QueueModule, AdminFeatureFlagsModule],
  controllers: [AdminPricingController, AdminPricingRevisionController],
  providers: [AdminPricingService, AdminPricingRevisionAssistantService, AdminPricingRevisionThrottleGuard],
  exports: [AdminPricingService, AdminPricingRevisionAssistantService],
})
export class AdminPricingModule {}
