import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [LeadsController],
  providers: [LeadsService, SupabaseService],
  exports: [LeadsService]
})
export class LeadsModule {}
