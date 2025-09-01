import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AccountingService } from "./accounting.service";
import { SupabaseModule } from "../../lib/supabase/supabase.module";

@Module({
  imports: [ScheduleModule.forRoot(), SupabaseModule],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
