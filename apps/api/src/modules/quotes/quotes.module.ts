import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { PdfService } from '../pdf/pdf.service';
import { SupabaseModule } from '../../lib/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [QuotesController],
  providers: [QuotesService, PdfService],
  exports: [QuotesService],
})
export class QuotesModule {}
