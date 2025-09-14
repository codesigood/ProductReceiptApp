"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerReceiptHandlers = registerReceiptHandlers;
const electron_1 = require("electron");
const users_js_1 = require("./users.js");
const turso_js_1 = require("../db/turso.js");
const printerIpc_js_1 = require("./printerIpc.js");
function requireAuth(token) {
    const s = users_js_1.sessions.get(token);
    if (!s) {
        throw new Error("Unauthorized");
    }
    return s;
}
function registerReceiptHandlers() {
    electron_1.ipcMain.handle("receipt:create", async (_evt, payload) => {
        const { token, total = 0, items = [] } = payload;
        try {
            const { id } = requireAuth(token);
            await (0, turso_js_1.createReceipt)(id, total, items);
            return { success: true };
        }
        catch (e) {
            return { success: false, message: e.message };
        }
    });
    electron_1.ipcMain.handle("receipt:getBySalesPerson", async (_evt, { token }) => {
        try {
            const { id } = requireAuth(token);
            const rows = await (0, turso_js_1.getReceiptsBySalesPerson)(id);
            return { success: true, data: rows };
        }
        catch (e) {
            return { success: false, message: e.message };
        }
    });
    electron_1.ipcMain.handle("receipt:getAll", async (_evt, { token }) => {
        try {
            const { role } = requireAuth(token);
            if (role !== "admin")
                throw new Error("Forbidden");
            const rows = await (0, turso_js_1.getAllReceipts)();
            return { success: true, data: rows };
        }
        catch (e) {
            return { success: false, message: e.message };
        }
    });
    electron_1.ipcMain.handle("receipt:search", async (_evt, { token, startDate, endDate, productName, salesPersonId }) => {
        try {
            const { role } = requireAuth(token);
            if (role !== "admin")
                throw new Error("Forbidden");
            const rows = await (0, turso_js_1.searchReceipts)(startDate, endDate, productName, salesPersonId);
            return { success: true, data: rows };
        }
        catch (e) {
            return { success: false, message: e.message };
        }
    });
    electron_1.ipcMain.handle("receipt:create-manual", async (_evt, payload) => {
        const { token, receiptData } = payload;
        try {
            const s = requireAuth(token);
            const user = await (0, turso_js_1.getUserById)(s.id);
            if (!user) {
                return { success: false, message: "User not found." };
            }
            const { name, weight, sg, goldKarat, amount } = receiptData;
            // Capture the transactionCode
            const transactionCode = await (0, turso_js_1.createManualReceipt)(s.id, name, weight, sg, goldKarat, amount);
            if (!printerIpc_js_1.printer) {
                return { success: true, printerWarning: "Printer not initialized. Receipt saved.", transactionCode }; // Return transactionCode
            }
            const isConnected = await printerIpc_js_1.printer.isConnected();
            if (!isConnected) {
                return { success: true, printerWarning: "Printer not connected. Receipt saved.", transactionCode }; // Return transactionCode
            }
            const manualReceiptData = {
                cashier: user.email,
                name,
                weight,
                sg,
                goldKarat,
                amount,
                createdAt: new Date(),
                transactionCode, // Pass transactionCode to printer
            };
            await printerIpc_js_1.printer.printReceipt(manualReceiptData);
            return { success: true, transactionCode }; // Return transactionCode
        }
        catch (e) {
            return { success: false, message: e.message };
        }
    });
    electron_1.ipcMain.handle("receipt:getAllManual", async (_evt, { token, limit, offset }) => {
        try {
            const { role } = requireAuth(token);
            if (role !== "admin")
                throw new Error("Forbidden");
            const { receipts, totalCount } = await (0, turso_js_1.getAllManualReceipts)(limit, offset);
            return { success: true, receipts, totalCount };
        }
        catch (e) {
            return { success: false, message: e.message };
        }
    });
    electron_1.ipcMain.handle("receipt:getDailyManualBySalesPerson", async (_evt, { token, limit = 50, offset = 0 }) => {
        try {
            // Authenticate the token and get user info
            const { id } = requireAuth(token);
            // Fetch paginated daily manual receipts
            const { receipts, totalCount } = await (0, turso_js_1.getDailyManualReceiptsBySalesPerson)(id, limit, offset);
            return { success: true, data: receipts, totalCount };
        }
        catch (e) {
            console.error("Backend: Error in getDailyManualBySalesPerson:", e);
            return { success: false, message: e.message };
        }
    });
    electron_1.ipcMain.handle("receipt:searchManual", async (_evt, { token, startDate, endDate, salesPersonId, search, limit, offset }) => {
        try {
            // Validate token & role
            const { role } = requireAuth(token);
            if (role !== "admin")
                throw new Error("Forbidden");
            // Call your search function with pagination
            const { receipts, totalCount } = await (0, turso_js_1.searchManualReceipts)(startDate, endDate, salesPersonId, search, limit, offset);
            return { success: true, receipts, totalCount };
        }
        catch (e) {
            return { success: false, message: e.message };
        }
    });
}
//# sourceMappingURL=receipts.js.map