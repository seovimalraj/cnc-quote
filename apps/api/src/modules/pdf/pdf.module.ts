import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';

/**
 * PDF Module
 * Provides PDF generation services for quotes, invoices, and reports
 */
@Module({
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
