import { Module } from '@nestjs/common';
import { AdminDevController } from './admin-dev.controller';
import { AdminDevService } from './admin-dev.service';
import { SupabaseModule } from "../../../lib/supabase/supabase.module";
import { CacheModule } from "../../../lib/cache/cache.module";

@Module({
  imports: [SupabaseModule, CacheModule],
  controllers: [AdminDevController],
  providers: [AdminDevService],
  exports: [AdminDevService],
})
export class AdminDevModule {}
