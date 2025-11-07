import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AccountingService } from "./accounting.service";

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
