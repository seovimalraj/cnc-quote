import { Module } from '@nestjs/common';
import { AdminRbacController } from './admin-rbac.controller';
import { AdminRbacService } from './admin-rbac.service';

@Module({
  imports: [], // SupabaseModule removed - it's @Global
  controllers: [AdminRbacController],
  providers: [AdminRbacService],
  exports: [AdminRbacService],
})
export class AdminRbacModule {}
