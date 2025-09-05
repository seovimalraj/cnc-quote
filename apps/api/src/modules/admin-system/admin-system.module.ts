import { Module } from '@nestjs/common';
import { AdminSystemController, AdminSystemHealthController } from './admin-system.controller';
import { AdminSystemService } from './admin-system.service';
import { SupabaseModule } from '../../lib/supabase/supabase.module';
import { CacheModule } from '../../lib/cache/cache.module';

@Module({
  imports: [SupabaseModule, CacheModule],
  controllers: [AdminSystemController, AdminSystemHealthController],
  providers: [AdminSystemService],
  exports: [AdminSystemService],
})
export class AdminSystemModule {}
