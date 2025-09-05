import { Module } from '@nestjs/common';
import { AdminErrorsController } from './admin-errors.controller';
import { AdminErrorsService } from './admin-errors.service';
import { SupabaseModule } from '../../lib/supabase/supabase.module';
import { CacheModule } from '../../lib/cache/cache.module';

@Module({
  imports: [SupabaseModule, CacheModule],
  controllers: [AdminErrorsController],
  providers: [AdminErrorsService],
  exports: [AdminErrorsService],
})
export class AdminErrorsModule {}
