import { Module } from '@nestjs/common';

import { AdminContentController } from './admin-content.controller';
import { AdminContentService } from './admin-content.service';

@Module({
  imports: [], // SupabaseModule removed - it's @Global
  controllers: [AdminContentController],
  providers: [AdminContentService],
  exports: [AdminContentService],
})
export class AdminContentModule {}
