import { Module } from "@nestjs/common";
import { DfmController } from "./dfm.controller";
import { DfmService } from "./dfm.service";
import { SupabaseModule } from "../../lib/supabase/supabase.module";
import { CacheModule } from "../../lib/cache/cache.module";

@Module({
  imports: [SupabaseModule, CacheModule],
  controllers: [DfmController],
  providers: [DfmService],
  exports: [DfmService],
})
export class DfmModule {}
