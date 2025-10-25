import { Module } from '@nestjs/common';
import { AdminRbacController } from './admin-rbac.controller';
import { AdminRbacService } from './admin-rbac.service';
import { SupabaseModule } from "../../../lib/supabase/supabase.module";
import { CacheModule } from "../../../lib/cache/cache.module";

@Module({
  imports: [SupabaseModule, CacheModule],
  controllers: [AdminRbacController],
  providers: [AdminRbacService],
  exports: [AdminRbacService],
})
export class AdminRbacModule {}
