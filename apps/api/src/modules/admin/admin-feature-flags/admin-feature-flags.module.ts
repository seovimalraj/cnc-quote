import { Module } from '@nestjs/common';
import { AdminFeatureFlagsController } from './admin-feature-flags.controller';
import { AdminFeatureFlagsService } from './admin-feature-flags.service';

@Module({
  imports: [], // SupabaseModule removed - it's @Global
  controllers: [AdminFeatureFlagsController],
  providers: [AdminFeatureFlagsService],
  exports: [AdminFeatureFlagsService],
})
export class AdminFeatureFlagsModule {}
