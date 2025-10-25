/**
 * Step 14: Outcomes Module
 * Registers outcomes service and controller
 */

import { Module } from '@nestjs/common';
import { OutcomesController } from './outcomes.controller';
import { OutcomesService } from './outcomes.service';
import { SupabaseModule } from '../../../lib/supabase/supabase.module';
import { AuditModule } from '../../audit-legacy/audit.module';
import { AnalyticsModule } from '../../analytics/analytics.module';

@Module({
  imports: [SupabaseModule, AuditModule, AnalyticsModule],
  controllers: [OutcomesController],
  providers: [OutcomesService],
  exports: [OutcomesService],
})
export class OutcomesModule {}
