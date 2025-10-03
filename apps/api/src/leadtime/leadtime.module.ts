/**
 * Step 12: Lead Time Module
 * Module registration for capacity ledger and dynamic lead time features
 */

import { Module } from '@nestjs/common';
import { LeadtimeController } from './leadtime.controller';
import { LeadtimeService } from './leadtime.service';

@Module({
  controllers: [LeadtimeController],
  providers: [LeadtimeService],
  exports: [LeadtimeService],
})
export class LeadtimeModule {}
