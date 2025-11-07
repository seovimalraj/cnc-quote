import { Module } from '@nestjs/common';
import { AdminComplianceController } from './admin-compliance.controller';
import { AdminComplianceService } from './admin-compliance.service';

@Module({
  imports: [], // SupabaseModule removed - it's @Global
  controllers: [AdminComplianceController],
  providers: [AdminComplianceService],
  exports: [AdminComplianceService],
})
export class AdminComplianceModule {}
