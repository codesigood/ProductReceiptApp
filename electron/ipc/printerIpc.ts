import { ipcMain, BrowserWindow } from "electron";
import { PrinterService, PrinterType } from "../services/printer.js";

export let printer: PrinterService | null = null;

// ✅ Initialize with first detected printer (if any)
export async function initializePrinterService(mainWindow: BrowserWindow) {
  try {
    const devices = await PrinterService.findPrinters(mainWindow);
    

    if (devices.length > 0) {
      printer = new PrinterService({
        type: "epson", // Default type
        printerName: devices[0].name,
      });
      console.log("✅ Printer initialized:", devices[0].name);
      mainWindow.webContents.send("printer:status", { connected: true, device: devices[0].name });
    } else {
      console.log("⚠️ No printers detected.");
      mainWindow.webContents.send("printer:status", { connected: false });
    }
  } catch (err) {
    console.error("Printer initialization error:", err);
    mainWindow.webContents.send("printer:status", { connected: false });
  }
}



// ✅ Register IPC handlers
export function registerPrinterIpc(mainWindow: BrowserWindow) {
  // List available printers
  ipcMain.handle("printer:list", async () => {
    try {
      const devices = await PrinterService.findPrinters(mainWindow);
      return { success: true, devices };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Select a printer manually
  ipcMain.handle("printer:select", async (_event, { type, printerName }) => {
    try {
      printer = new PrinterService({
        type: type as PrinterType,
        printerName: printerName,
      });
      console.log("✅ Printer manually selected:", { type, printerName });
      mainWindow.webContents.send("printer:status", { connected: true, device: printerName });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Check connection
  ipcMain.handle("printer:isConnected", async () => {
    if (!printer) return false;
    try {
      return await printer.isConnected();
    } catch {
      return false;
    }
  });

  // Print receipt
  ipcMain.handle("printer:printReceipt", async (_event, receiptData) => {
    if (!printer) return { success: false, error: "Printer not initialized." };
    try {
      const success = await printer.printReceipt(receiptData);
      return { success };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Preview
  ipcMain.handle("printer:generatePreview", async (_event, receiptData) => {
    if (!printer) return { success: false, error: "Printer not initialized." };
    try {
      const content = await printer.generateReceiptContent(receiptData);
      return { success: true, content };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Manual Preview
  ipcMain.handle("printer:generateManualPreview", async (_event, receiptData) => {
    if (!printer) return { success: false, error: "Printer not initialized." };
    try {
      const content = await printer.generateManualReceiptPreview(receiptData);
      return { success: true, content };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
