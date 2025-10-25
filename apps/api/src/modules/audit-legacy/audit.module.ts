import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { SupabaseModule } from '../../lib/supabase/supabase.module';
import { AuditController } from './audit.controller';
import { RbacModule } from '../auth/rbac.module';

@Global()
@Module({
  imports: [SupabaseModule, RbacModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
