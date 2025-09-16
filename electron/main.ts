import 'dotenv/config';
import { app, BrowserWindow, globalShortcut } from 'electron';
import path from 'path';

import { initDB } from "./db/turso.js";
import { registerUserHandlers } from "./ipc/users.js";
import { registerReceiptHandlers } from "./ipc/receipts.js";
import { registerPrinterIpc, initializePrinterService } from './ipc/printerIpc.js';
import { registerProductHandlers } from './ipc/products.js';
import { registerCompanyProfileHandlers } from './ipc/companyProfile.js';
import { registerGoogleDriveIPC } from './ipc/googleDriveIPC.js';
import { registerEmailBackupIPC } from './ipc/emailBackupIPC.js';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load app
  if (process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();

    // ✅ Only open DevTools in dev mode
    if (process.env.NODE_ENV === "development") {
      mainWindow.webContents.openDevTools();
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  }

  // ❌ Block F12 and Ctrl+Shift+I
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (
      (input.control && input.shift && input.key.toLowerCase() === "i") ||
      input.key.toLowerCase() === "f12"
    ) {
      event.preventDefault();
    }
  });

  // ❌ Force-close DevTools if somehow opened
  mainWindow.webContents.on("devtools-opened", () => {
    mainWindow.webContents.closeDevTools();
  });

  return mainWindow;
}

app.whenReady().then(async () => {
  await initDB();

  const mainWindow = createWindow();

  // Register IPC handlers
  registerUserHandlers();
  registerReceiptHandlers();
  registerProductHandlers();
  registerCompanyProfileHandlers();
  registerGoogleDriveIPC();
  registerEmailBackupIPC();

  await initializePrinterService(mainWindow);
  registerPrinterIpc(mainWindow);

  // ❌ Disable global DevTools shortcuts
  globalShortcut.register("CommandOrControl+Shift+I", () => {});
  globalShortcut.register("F12", () => {});

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
