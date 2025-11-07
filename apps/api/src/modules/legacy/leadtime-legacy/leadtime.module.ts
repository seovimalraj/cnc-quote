/**
 * Step 12: Lead Time Module
 * Module registration for capacity ledger and dynamic lead time features
 */

import { Module } from '@nestjs/common';
import { LeadtimeController } from './leadtime.controller';
import { LeadtimeService } from './leadtime.service';
// CacheModule not imported - it's @Global in app.module

@Module({
  imports: [], // SupabaseModule removed - it's @Global  // CacheModule removed - it's global
  controllers: [LeadtimeController],
  providers: [LeadtimeService],
  exports: [LeadtimeService],
})
export class LeadtimeModule {}
