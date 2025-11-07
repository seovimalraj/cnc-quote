import { Module } from '@nestjs/common';
import { AdminDevController } from './admin-dev.controller';
import { AdminDevService } from './admin-dev.service';

@Module({
  imports: [], // SupabaseModule removed - it's @Global
  controllers: [AdminDevController],
  providers: [AdminDevService],
  exports: [AdminDevService],
})
export class AdminDevModule {}
