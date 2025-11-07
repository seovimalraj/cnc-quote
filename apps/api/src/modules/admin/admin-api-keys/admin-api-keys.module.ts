import { Module } from '@nestjs/common';
import { AdminApiKeysController } from './admin-api-keys.controller';
import { AdminApiKeysService } from './admin-api-keys.service';

@Module({
  imports: [], // SupabaseModule removed - it's @Global
  controllers: [AdminApiKeysController],
  providers: [AdminApiKeysService],
  exports: [AdminApiKeysService],
})
export class AdminApiKeysModule {}
