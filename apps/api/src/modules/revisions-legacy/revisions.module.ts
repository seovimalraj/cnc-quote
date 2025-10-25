/**
 * Step 16: Revisions Module
 * NestJS module registration
 */

import { Module } from '@nestjs/common';
import { RevisionsController } from './revisions.controller';
import { RevisionsService } from './revisions.service';
import { RevisionWriterService } from './revision-writer.service';
import { SupabaseModule } from '../../lib/supabase/supabase.module';
import { AuditModule } from '../audit-legacy/audit.module';

@Module({
  imports: [SupabaseModule, AuditModule],
  controllers: [RevisionsController],
  providers: [RevisionsService, RevisionWriterService],
  exports: [RevisionsService, RevisionWriterService],
})
export class RevisionsModule {}
