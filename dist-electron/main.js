"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const turso_js_1 = require("./db/turso.js");
const users_js_1 = require("./ipc/users.js");
const receipts_js_1 = require("./ipc/receipts.js");
const printerIpc_js_1 = require("./ipc/printerIpc.js");
const products_js_1 = require("./ipc/products.js");
const companyProfile_js_1 = require("./ipc/companyProfile.js");
const googleDriveIPC_js_1 = require("./ipc/googleDriveIPC.js");
const emailBackupIPC_js_1 = require("./ipc/emailBackupIPC.js");
function createWindow() {
    const mainWindow = new electron_1.BrowserWindow({
        width: 1000,
        height: 700,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    // Load app
    if (process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL);
        // ✅ Only open DevTools in dev mode
        if (process.env.NODE_ENV === "development") {
            mainWindow.webContents.openDevTools();
        }
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/renderer/index.html'));
    }
    // ❌ Block F12 and Ctrl+Shift+I
    mainWindow.webContents.on("before-input-event", (event, input) => {
        if ((input.control && input.shift && input.key.toLowerCase() === "i") ||
            input.key.toLowerCase() === "f12") {
            event.preventDefault();
        }
    });
    // ❌ Force-close DevTools if somehow opened
    mainWindow.webContents.on("devtools-opened", () => {
        mainWindow.webContents.closeDevTools();
    });
    return mainWindow;
}
electron_1.app.whenReady().then(async () => {
    await (0, turso_js_1.initDB)();
    const mainWindow = createWindow();
    // Register IPC handlers
    (0, users_js_1.registerUserHandlers)();
    (0, receipts_js_1.registerReceiptHandlers)();
    (0, products_js_1.registerProductHandlers)();
    (0, companyProfile_js_1.registerCompanyProfileHandlers)();
    (0, googleDriveIPC_js_1.registerGoogleDriveIPC)();
    (0, emailBackupIPC_js_1.registerEmailBackupIPC)();
    await (0, printerIpc_js_1.initializePrinterService)(mainWindow);
    (0, printerIpc_js_1.registerPrinterIpc)(mainWindow);
    // ❌ Disable global DevTools shortcuts
    electron_1.globalShortcut.register("CommandOrControl+Shift+I", () => { });
    electron_1.globalShortcut.register("F12", () => { });
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
//# sourceMappingURL=main.js.map