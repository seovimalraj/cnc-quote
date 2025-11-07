import { Module } from '@nestjs/common';
import { AdminOrgsController } from './admin-orgs.controller';
import { AdminOrgsService } from './admin-orgs.service';

@Module({
  imports: [], // SupabaseModule removed - it's @Global
  controllers: [AdminOrgsController],
  providers: [AdminOrgsService],
  exports: [AdminOrgsService],
})
export class AdminOrgsModule {}
