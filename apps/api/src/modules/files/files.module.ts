import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { StorageService } from './storage.service';
import { SupabaseService } from '../../lib/supabase/supabase.service';

@Module({
  controllers: [FilesController],
  providers: [StorageService, SupabaseService],
  exports: [StorageService]
})
export class FilesModule {}
