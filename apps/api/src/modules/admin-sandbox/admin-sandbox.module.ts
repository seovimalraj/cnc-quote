import { Module } from '@nestjs/common';
import { AdminSandboxController } from './admin-sandbox.controller';
import { AdminSandboxService } from './admin-sandbox.service';
import { SupabaseModule } from "../../lib/supabase/supabase.module";
import { CacheModule } from "../../lib/cache/cache.module";

@Module({
  imports: [SupabaseModule, CacheModule],
  controllers: [AdminSandboxController],
  providers: [AdminSandboxService],
  exports: [AdminSandboxService],
})
export class AdminSandboxModule {}
