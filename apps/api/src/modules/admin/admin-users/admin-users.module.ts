import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
// CacheModule removed - it's @Global

@Module({
  imports: [], // SupabaseModule removed - it's @Global // CacheModule removed - it's global
  controllers: [AdminUsersController],
  providers: [AdminUsersService],
  exports: [AdminUsersService],
})
export class AdminUsersModule {}
