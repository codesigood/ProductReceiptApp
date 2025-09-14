/* eslint-disable @typescript-eslint/no-var-requires */
import type { PosPrintOptions, PosPrintData } from "electron-pos-printer";
import { BrowserWindow } from "electron";

// Use CommonJS require so packaging works
const { PosPrinter } = require("electron-pos-printer");

export type PrinterType = "epson" | "star";

export interface PrinterConfig {
  type: PrinterType;
  printerName: string;
}

export class PrinterService {
  private config: PrinterConfig;

  constructor(config: PrinterConfig) {
    this.config = config;
  }

  async isConnected(): Promise<boolean> {
    return !!this.config.printerName;
  }

  async printReceipt(receiptData: Record<string, any>): Promise<boolean> {
    if (!this.config.printerName) {
      throw new Error("Printer not selected.");
    }
    if (!receiptData || typeof receiptData !== "object" || Object.keys(receiptData).length === 0) {
      throw new Error("Receipt data is empty or invalid.");
    }

    const options: PosPrintOptions = {
      printerName: this.config.printerName,
      timeOutPerLine: 800,
      copies: 1,
      margins: { marginType: "printableArea", bottom: 10 },
      silent: false,
      pageSize: "58mm",
      boolean:false,
    };

    const data: PosPrintData[] = [
      { type: "text", value: "Receipt", style: { textAlign: "center", fontWeight: "bold" } },
      { type: "text", value: "----------------------", style: { textAlign: "center" } },
      { type: "text", value: ` ${receiptData.companyProfile?.name}`, style: { textAlign: "center", fontSize: "36" } },
      { type: "text", value: ` ${receiptData.companyProfile?.phone}`, style: { textAlign: "center", fontSize: "36" } },
      { type: "text", value: ` ${receiptData.companyProfile?.address}`, style: { textAlign: "center", fontSize: "36" } },
      { type: "text", value: "----------------------", style: { textAlign: "center" } },
      { type: "text", value: `Cashier: ${receiptData.cashier}`, style: { textAlign: "left" } },
      { type: "text", value: `Customer: ${receiptData.name}`, style: { textAlign: "left" } },
      { type: "text", value: `Weight: ${receiptData.weight}`, style: { textAlign: "left" } },
      { type: "text", value: `S.G: ${receiptData.sg}`, style: { textAlign: "left" } },
      { type: "text", value: `Gold Karat: ${receiptData.goldKarat}`, style: { textAlign: "left" } },
      { type: "text", value: `Date: ${new Date(receiptData.createdAt).toLocaleString()}`, style: { textAlign: "left" } },
      { type: "text", value: `Txn Code: ${receiptData.transactionCode}`, style: { textAlign: "left" } },
      { type: "text", value: "----------------------", style: { textAlign: "center" } },
      { type: "text", value: `Total: #${receiptData.amount}`, style: { textAlign: "left", fontWeight: "bold" } },
      { type: "text", value: "----------------------", style: { textAlign: "center" } },
    ];

    try {
      const result = await PosPrinter.print(data, options);
      console.log("✅ Print job sent successfully:", result);
      return result.complete === true;
    } catch (err) {
      console.error("❌ Print error:", err);
      return false;
    }
  }

  async generateReceiptContent(receiptData: any): Promise<string> {
    return `
Receipt
----------------------
Cashier: ${receiptData.cashier}
Customer: ${receiptData.name}
Weight: ${receiptData.weight}
S.G: ${receiptData.sg}
Gold Karat: ${receiptData.goldKarat}
Amount: ${receiptData.amount}
Txn Code: ${receiptData.transactionCode}
Date: ${new Date(receiptData.createdAt).toLocaleString()}
----------------------
Total: ${receiptData.amount}
`;
  }

  async generateManualReceiptPreview(receiptData: any): Promise<string> {
    return this.generateReceiptContent(receiptData);
  }

  static async findPrinters(mainWindow: BrowserWindow): Promise<{ name: string }[]> {
    if (!mainWindow?.webContents) return [];
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers.map((p: any) => ({ name: p.name }));
  }
}
