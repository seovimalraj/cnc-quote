import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { AuthModule } from "../../core/auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService]
})
export class LeadsModule {}
