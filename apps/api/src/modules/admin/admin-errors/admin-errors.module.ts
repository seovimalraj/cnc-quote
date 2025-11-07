import { Module } from '@nestjs/common';
import { AdminErrorsController } from './admin-errors.controller';
import { AdminErrorsService } from './admin-errors.service';

@Module({
  imports: [], // SupabaseModule removed - it's @Global
  controllers: [AdminErrorsController],
  providers: [AdminErrorsService],
  exports: [AdminErrorsService],
})
export class AdminErrorsModule {}
