import { Injectable } from '@nestjs/common';
import * as PDFKit from 'pdfkit';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class PdfService {
  private readonly templatesPath: string;

  constructor(private readonly configService: ConfigService) {
    this.templatesPath = join(process.cwd(), 'templates', 'pdf');
  }

  async generatePdf(data: any): Promise<Buffer> {
    const doc = new PDFKit();

    // Convert the PDF to a buffer
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Generate the PDF content
      this.generatePdfContent(doc, data);

      doc.end();
    });
  }

  private generatePdfContent(doc: PDFKit.PDFDocument, data: any): void {
    doc
      .fontSize(25)
      .text('Quote', { align: 'center' })
      .moveDown()
      .fontSize(12);

    // Add quote details
    if (data.quote) {
      doc
        .text(`Quote Number: ${data.quote.id}`)
        .text(`Date: ${new Date(data.quote.created_at).toLocaleDateString()}`)
        .moveDown();
    }

    // Add customer details if available
    if (data.customer) {
      doc
        .text('Customer Information')
        .text(`Name: ${data.customer.name}`)
        .text(`Email: ${data.customer.email}`)
        .moveDown();
    }

    // Add items
    if (data.items && data.items.length > 0) {
      doc.text('Items:').moveDown();

      data.items.forEach((item: any, index: number) => {
        doc
          .text(`${index + 1}. ${item.name}`)
          .text(`   Quantity: ${item.quantity}`)
          .text(`   Unit Price: $${item.unit_price.toFixed(2)}`)
          .text(`   Subtotal: $${item.subtotal.toFixed(2)}`)
          .moveDown();
      });
    }

    // Add totals
    if (data.totals) {
      doc
        .moveDown()
        .text(`Subtotal: $${data.totals.subtotal.toFixed(2)}`)
        .text(`Tax: $${data.totals.tax.toFixed(2)}`)
        .text(`Total: $${data.totals.total.toFixed(2)}`);
    }

    // Add footer
    doc
      .moveDown()
      .fontSize(10)
      .text('Thank you for your business!', { align: 'center' });
  }
}
