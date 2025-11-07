import { Module } from '@nestjs/common';
import { AdminSandboxController } from './admin-sandbox.controller';
import { AdminSandboxService } from './admin-sandbox.service';

@Module({
  imports: [], // SupabaseModule removed - it's @Global
  controllers: [AdminSandboxController],
  providers: [AdminSandboxService],
  exports: [AdminSandboxService],
})
export class AdminSandboxModule {}
