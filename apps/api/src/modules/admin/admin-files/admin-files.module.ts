import { Module } from '@nestjs/common';
import { AdminFilesController } from './admin-files.controller';
import { AdminFilesService } from './admin-files.service';

@Module({
  imports: [], // SupabaseModule removed - it's @Global
  controllers: [AdminFilesController],
  providers: [AdminFilesService],
  exports: [AdminFilesService],
})
export class AdminFilesModule {}
