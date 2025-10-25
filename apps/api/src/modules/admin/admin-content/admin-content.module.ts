import { Module } from '@nestjs/common';

import { SupabaseModule } from "../../../lib/supabase/supabase.module";
import { AdminContentController } from './admin-content.controller';
import { AdminContentService } from './admin-content.service';

@Module({
  imports: [SupabaseModule],
  controllers: [AdminContentController],
  providers: [AdminContentService],
  exports: [AdminContentService],
})
export class AdminContentModule {}
