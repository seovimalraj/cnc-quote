import { Injectable } from "@nestjs/common";
import * as PDFKit from "pdfkit";
import { ConfigService } from "@nestjs/config";
import { join } from "path";
import { DocumentData, ContentItem } from "./pdf.types";

@Injectable()
export class PdfService {
  private readonly templatesPath: string;

  constructor(private readonly configService: ConfigService) {
    this.templatesPath = join(process.cwd(), "templates", "pdf");
  }

  async generatePdf(data: DocumentData): Promise<Buffer> {
    const doc = new PDFKit(data.options);

    // Convert the PDF to a buffer
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Add header if present
      if (data.header) {
        this.addContentItems(doc, data.header);
      }

      // Add main content
      this.addContentItems(doc, data.content);

      // Add footer if present
      if (data.footer) {
        this.addContentItems(doc, data.footer);
      }

      doc.end();
    });
  }

  private addContentItems(doc: PDFKit.PDFDocument, items: ContentItem[]): void {
    for (const item of items) {
      switch (item.type) {
        case "text":
          if (item.content && typeof item.content === "string") {
            const options: PDFKit.Mixins.TextOptions = {
              width: item.style?.width,
              align: item.style?.alignment as PDFKit.Mixins.TextAlignment,
              lineBreak: true,
            };

            if (item.style?.fontSize) {
              doc.fontSize(item.style.fontSize);
            }
            if (item.style?.font) {
              doc.font(item.style.font);
            }
            if (item.style?.color) {
              doc.fillColor(item.style.color);
            }

            if (item.position) {
              doc.text(item.content, item.position.x || 0, item.position.y || 0, options);
            } else {
              doc.text(item.content, options);
            }
          }
          break;
        case "line":
          if (item.position && item.dimensions) {
            doc.moveTo(item.position.x || 0, item.position.y || 0)
               .lineTo((item.position.x || 0) + (item.dimensions.width || 0), 
                      (item.position.y || 0) + (item.dimensions.height || 0))
               .stroke();
          }
          break;
        case "space":
          doc.moveDown();
          break;
      }
    }
  }
    }

    // Add items
    if (data.items && data.items.length > 0) {
      doc.text("Items:").moveDown();

      data.content.forEach((item: ContentItem, index: number) => {
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
    doc.moveDown().fontSize(10).text("Thank you for your business!", { align: "center" });
  }
}
