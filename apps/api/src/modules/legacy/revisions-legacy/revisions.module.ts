/**
 * Step 16: Revisions Module
 * NestJS module registration
 */

import { Module } from '@nestjs/common';
import { RevisionsController } from './revisions.controller';
import { RevisionsService } from './revisions.service';
import { RevisionWriterService } from './revision-writer.service';
import { AuditModule } from "../audit-legacy/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [RevisionsController],
  providers: [RevisionsService, RevisionWriterService],
  exports: [RevisionsService, RevisionWriterService],
})
export class RevisionsModule {}
