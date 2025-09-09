import { Module } from '@nestjs/common';
import { AdminDfmController } from './admin-dfm.controller';
import { AdminDfmService } from './admin-dfm.service';
import { SupabaseService } from '../../lib/supabase/supabase.service';

@Module({
  controllers: [AdminDfmController],
  providers: [AdminDfmService, SupabaseService],
  exports: [AdminDfmService],
})
export class AdminDfmModule {}
