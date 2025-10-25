import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ManualReviewService } from "./manual-review.service";
import { ManualReviewController } from "./manual-review.controller";
import { ManualReviewProcessor } from "./manual-review.processor";
import { SupabaseModule } from "../../lib/supabase/supabase.module";
import { NotifyModule } from "../notify/notify.module";
import { QueueModule } from "../../queues";

@Module({
  imports: [EventEmitterModule.forRoot(), SupabaseModule, NotifyModule, QueueModule],
  providers: [ManualReviewService, ManualReviewProcessor],
  controllers: [ManualReviewController],
  exports: [ManualReviewService],
})
export class ManualReviewModule {}
