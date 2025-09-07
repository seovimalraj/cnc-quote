import { Module } from "@nestjs/common";
import { DfmController } from "./dfm.controller";
import { DfmService } from "./dfm.service";
import { DfmAnalysisProcessor } from "../../queues/jobs/dfm-analysis.processor";
import { SupabaseModule } from "../../lib/supabase/supabase.module";
import { CacheModule } from "../../lib/cache/cache.module";
import { BullModule } from "@nestjs/bullmq";

@Module({
  imports: [
    SupabaseModule,
    CacheModule,
    BullModule.registerQueue({
      name: "dfm-analysis",
    }),
  ],
  controllers: [DfmController],
  providers: [DfmService, DfmAnalysisProcessor],
  exports: [DfmService],
})
export class DfmModule {}
