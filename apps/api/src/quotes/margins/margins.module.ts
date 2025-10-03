/**
 * Step 14: Margins Module
 */

import { Module } from '@nestjs/common';
import { MarginsController } from './margins.controller';
import { MarginsService } from './margins.service';
import { SupabaseModule } from '../../lib/supabase/supabase.module';
import { AuditModule } from '../../audit/audit.module';

@Module({
  imports: [SupabaseModule, AuditModule],
  controllers: [MarginsController],
  providers: [MarginsService],
  exports: [MarginsService],
})
export class MarginsModule {}
