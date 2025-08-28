import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { BullModule } from '@nestjs/bull';
import { SupabaseModule } from '../../lib/supabase/supabase.module';

@Module({
  imports: [
    SupabaseModule,
    BullModule.registerQueue({
      name: 'files',
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
