import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AdminHealthController } from './admin-health.controller';
import { AdminHealthService } from './admin-health.service';
import { SupabaseModule } from '../../lib/supabase/supabase.module';
import { CacheModule } from '../../lib/cache/cache.module';
import { QueueModule } from '../../queues';

@Module({
  imports: [
    SupabaseModule,
    CacheModule,
    HttpModule.register({ timeout: 5000, maxRedirects: 0 }),
    QueueModule,
  ],
  controllers: [AdminHealthController],
  providers: [AdminHealthService],
  exports: [AdminHealthService],
})
export class AdminHealthModule {}
