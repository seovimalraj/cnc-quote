import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";

interface _TextOptions {
  align?: "left" | "center" | "right";
  underline?: boolean;
}

@Injectable()
export class PdfService {
  async generateQuotePDF(data: {
    quote_number: string;
    date: string;
    customer: {
      name: string;
      email: string;
      address?: string;
    };
    items: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
    }>;
    totals: {
      subtotal: number;
      tax: number;
      total: number;
    }
  ): Promise<PDFDocument> {
    const doc = new PDFDocument();

    // Header
    doc.fontSize(24).text("Quote", { align: "center" });
    doc.moveDown();

    // Quote details
    doc.fontSize(12).text(`Quote Number: ${data.quote_number}`).text(`Date: ${data.date}`);

    doc.moveDown();

    // Customer details
    doc.fontSize(14).text("Customer Information");
    doc.fontSize(12).text(`Name: ${data.customer.name}`).text(`Email: ${data.customer.email}`);

    if (data.customer.address) {
      doc.text(`Address: ${data.customer.address}`);
    }

    doc.moveDown();

    // Items table
    doc.fontSize(14).text("Items");
    doc.moveDown();

    // Table headers
    const tableTop = doc.y;
    const descriptionX = 50;
    const quantityX = 300;
    const priceX = 400;
    const totalX = 500;

    doc
      .fontSize(12)
      .text("Description", descriptionX, tableTop)
      .text("Qty", quantityX, tableTop)
      .text("Price", priceX, tableTop)
      .text("Total", totalX, tableTop);

    doc.moveDown();

    // Table rows
    let yPos = doc.y;
    data.items.forEach((item) => {
      doc
        .fontSize(12)
        .text(item.description, descriptionX, yPos)
        .text(item.quantity.toString(), quantityX, yPos)
        .text(`$${item.unit_price.toFixed(2)}`, priceX, yPos)
        .text(`$${item.total.toFixed(2)}`, totalX, yPos);

      yPos = doc.y + 20;
    });

    doc.moveDown();

    // Totals
    const totalsX = 400;
    doc
      .fontSize(12)
      .text("Totals", { underline: true })
      .moveDown()
      .text("Subtotal:", totalsX)
      .text(`$${data.totals.subtotal.toFixed(2)}`, { align: "right" })
      .text("Tax:", totalsX)
      .text(`$${data.totals.tax.toFixed(2)}`, { align: "right" })
      .text("Total:", totalsX)
      .text(`$${data.totals.total.toFixed(2)}`, { align: "right" });

    // Footer
    doc.moveDown(2).fontSize(10).text("Thank you for your business!", { align: "center" });

    doc.end();
    return doc;
  }
}
