import { Module } from '@nestjs/common';
import { AdminApiKeysController } from './admin-api-keys.controller';
import { AdminApiKeysService } from './admin-api-keys.service';
import { SupabaseModule } from '../../lib/supabase/supabase.module';
import { CacheModule } from '../../lib/cache/cache.module';

@Module({
  imports: [SupabaseModule, CacheModule],
  controllers: [AdminApiKeysController],
  providers: [AdminApiKeysService],
  exports: [AdminApiKeysService],
})
export class AdminApiKeysModule {}
