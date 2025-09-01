import { Module } from "@nestjs/common";
import { ManualReviewService } from "./manual-review.service";
import { ManualReviewController } from "./manual-review.controller";
import { SupabaseModule } from "../../lib/supabase/supabase.module";
import { NotifyModule } from "../notify/notify.module";

@Module({
  imports: [SupabaseModule, NotifyModule],
  providers: [ManualReviewService],
  controllers: [ManualReviewController],
  exports: [ManualReviewService],
})
export class ManualReviewModule {}
