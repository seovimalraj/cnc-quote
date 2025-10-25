import { Module } from '@nestjs/common';
import { AdminComplianceController } from './admin-compliance.controller';
import { AdminComplianceService } from './admin-compliance.service';
import { SupabaseModule } from "../../../lib/supabase/supabase.module";
import { CacheModule } from "../../../lib/cache/cache.module";

@Module({
  imports: [SupabaseModule, CacheModule],
  controllers: [AdminComplianceController],
  providers: [AdminComplianceService],
  exports: [AdminComplianceService],
})
export class AdminComplianceModule {}
