import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { SupabaseModule } from '../lib/supabase/supabase.module';
import { AuditController } from './audit.controller';

@Global()
@Module({
  imports: [SupabaseModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
