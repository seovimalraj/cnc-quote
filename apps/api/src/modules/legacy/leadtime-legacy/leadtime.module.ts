/**
 * Step 12: Lead Time Module
 * Module registration for capacity ledger and dynamic lead time features
 */

import { Module } from '@nestjs/common';
import { LeadtimeController } from './leadtime.controller';
import { LeadtimeService } from './leadtime.service';
import { SupabaseModule } from "../../../lib/supabase/supabase.module";
import { CacheModule } from "../../../lib/cache/cache.module";

@Module({
  imports: [SupabaseModule, CacheModule],
  controllers: [LeadtimeController],
  providers: [LeadtimeService],
  exports: [LeadtimeService],
})
export class LeadtimeModule {}
