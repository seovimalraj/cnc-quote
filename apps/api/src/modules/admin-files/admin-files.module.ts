import { Module } from '@nestjs/common';
import { AdminFilesController } from './admin-files.controller';
import { AdminFilesService } from './admin-files.service';
import { SupabaseModule } from '../../lib/supabase/supabase.module';
import { CacheModule } from '../../lib/cache/cache.module';

@Module({
  imports: [SupabaseModule, CacheModule],
  controllers: [AdminFilesController],
  providers: [AdminFilesService],
  exports: [AdminFilesService],
})
export class AdminFilesModule {}
