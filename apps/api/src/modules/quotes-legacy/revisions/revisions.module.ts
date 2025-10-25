/**
 * Step 15: Quote Revisions Module
 */

import { Module } from '@nestjs/common';
import { QuoteRevisionsController } from './revisions.controller';
import { QuoteRevisionsService } from './revisions.service';
import { SupabaseModule } from '../../../lib/supabase/supabase.module';
import { AuditModule } from '../../audit-legacy/audit.module';

@Module({
  imports: [SupabaseModule, AuditModule],
  controllers: [QuoteRevisionsController],
  providers: [QuoteRevisionsService],
  exports: [QuoteRevisionsService],
})
export class QuoteRevisionsModule {}
