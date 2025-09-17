import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { NotifyModule } from "../notify/notify.module";
import { SupabaseModule } from "../../lib/supabase/supabase.module";

@Module({
  imports: [NotifyModule, SupabaseModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
