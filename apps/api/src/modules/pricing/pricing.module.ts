import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { ValidationService } from './validation.service';
import { SupabaseModule } from '../../lib/supabase/supabase.module';
import { CacheModule } from '../../lib/cache/cache.module';
import { ManualReviewModule } from '../manual-review/manual-review.module';

@Module({
  imports: [SupabaseModule, CacheModule, ManualReviewModule],
  controllers: [PricingController],
  providers: [PricingService, ValidationService],
  exports: [PricingService, ValidationService],
})
export class PricingModule {}
