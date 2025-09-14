"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printer = void 0;
exports.initializePrinterService = initializePrinterService;
exports.registerPrinterIpc = registerPrinterIpc;
const electron_1 = require("electron");
const printer_js_1 = require("../services/printer.js");
exports.printer = null;
// ✅ Initialize with first detected printer (if any)
async function initializePrinterService(mainWindow) {
    try {
        const devices = await printer_js_1.PrinterService.findPrinters(mainWindow);
        if (devices.length > 0) {
            exports.printer = new printer_js_1.PrinterService({
                type: "epson", // Default type
                printerName: devices[0].name,
            });
            console.log("✅ Printer initialized:", devices[0].name);
            mainWindow.webContents.send("printer:status", { connected: true, device: devices[0].name });
        }
        else {
            console.log("⚠️ No printers detected.");
            mainWindow.webContents.send("printer:status", { connected: false });
        }
    }
    catch (err) {
        console.error("Printer initialization error:", err);
        mainWindow.webContents.send("printer:status", { connected: false });
    }
}
// ✅ Register IPC handlers
function registerPrinterIpc(mainWindow) {
    // List available printers
    electron_1.ipcMain.handle("printer:list", async () => {
        try {
            const devices = await printer_js_1.PrinterService.findPrinters(mainWindow);
            return { success: true, devices };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    });
    // Select a printer manually
    electron_1.ipcMain.handle("printer:select", async (_event, { type, printerName }) => {
        try {
            exports.printer = new printer_js_1.PrinterService({
                type: type,
                printerName: printerName,
            });
            console.log("✅ Printer manually selected:", { type, printerName });
            mainWindow.webContents.send("printer:status", { connected: true, device: printerName });
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    });
    // Check connection
    electron_1.ipcMain.handle("printer:isConnected", async () => {
        if (!exports.printer)
            return false;
        try {
            return await exports.printer.isConnected();
        }
        catch {
            return false;
        }
    });
    // Print receipt
    electron_1.ipcMain.handle("printer:printReceipt", async (_event, receiptData) => {
        if (!exports.printer)
            return { success: false, error: "Printer not initialized." };
        try {
            const success = await exports.printer.printReceipt(receiptData);
            return { success };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    });
    // Preview
    electron_1.ipcMain.handle("printer:generatePreview", async (_event, receiptData) => {
        if (!exports.printer)
            return { success: false, error: "Printer not initialized." };
        try {
            const content = await exports.printer.generateReceiptContent(receiptData);
            return { success: true, content };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    });
    // Manual Preview
    electron_1.ipcMain.handle("printer:generateManualPreview", async (_event, receiptData) => {
        if (!exports.printer)
            return { success: false, error: "Printer not initialized." };
        try {
            const content = await exports.printer.generateManualReceiptPreview(receiptData);
            return { success: true, content };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    });
}
//# sourceMappingURL=printerIpc.js.map