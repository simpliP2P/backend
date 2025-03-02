import { Injectable } from "@nestjs/common";
import * as PDFDocument from "pdfkit";
import * as fs from "fs";

@Injectable()
export class PdfHelper {
  generatePurchaseOrderPDF(
    organisationName: string,
    poId: string,
    items: Array<{
      item_name: string;
      unit_price: number;
      currency: string;
      pr_quantity: number;
      po_quantity: number;
    }>,
    expectedDeliveryDate: Date,
    filePath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Add Purchase Order ID
      doc.fontSize(18).text(`Purchase Order - ${poId}`, 100, 80);

      // Add a gap of 20 units before the Organization name
      doc.fontSize(15).text(`Organization: ${organisationName}`, 100, 120); // Adjusted y-coordinate

      // Add Expected Delivery Date
      doc
        .fontSize(15)
        .text(`Expected Delivery Date: ${expectedDeliveryDate}`, 100, 160); // Adjusted y-coordinate

      // Create a table for items
      let y = 200; // Adjusted y-coordinate to add more space
      doc.fontSize(12).text("Item", 100, y);
      doc.text("Quantity", 200, y);
      doc.text("Price", 300, y);
      doc.text("Currency", 400, y); // Adjusted x-coordinate for Currency
      y += 20;

      items.forEach((item) => {
        doc.text(item.item_name, 100, y);
        doc.text((item.pr_quantity || item.po_quantity).toString(), 200, y);
        doc.text(item.unit_price.toString(), 300, y);
        doc.text(item.currency, 400, y); // Adjusted x-coordinate for Currency
        y += 20;
      });

      doc.end();

      stream.on("finish", () => resolve());
      stream.on("error", (err) => reject(err));
    });
  }
}
