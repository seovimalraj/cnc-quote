import { Module } from '@nestjs/common';
import { AdminOrgsController } from './admin-orgs.controller';
import { AdminOrgsService } from './admin-orgs.service';
import { SupabaseModule } from "../../lib/supabase/supabase.module";
import { CacheModule } from "../../lib/cache/cache.module";

@Module({
  imports: [SupabaseModule, CacheModule],
  controllers: [AdminOrgsController],
  providers: [AdminOrgsService],
  exports: [AdminOrgsService],
})
export class AdminOrgsModule {}
