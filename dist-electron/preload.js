"use strict";
const { contextBridge, ipcRenderer, IpcRendererEvent } = require("electron");
// ---------- IPC Renderer Wrapper ----------
contextBridge.exposeInMainWorld("electron", {
    ipcRenderer: {
        invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
        on: (channel, func) => {
            const subscription = (_event, ...args) => func(...args);
            ipcRenderer.on(channel, subscription);
            return () => ipcRenderer.removeListener(channel, subscription);
        },
        removeListener: (channel, func) => {
            ipcRenderer.removeListener(channel, func);
        },
    },
});
// ---------- User / Receipt / Product / Company APIs ----------
contextBridge.exposeInMainWorld("api", {
    user: {
        create: (token, email, password, role) => ipcRenderer.invoke("user:create", { token, email, password, role }),
        login: (email, password) => ipcRenderer.invoke("user:login", { email, password }),
        logout: (token) => ipcRenderer.invoke("user:logout", { token }),
        getAll: (token) => ipcRenderer.invoke("user:getAll", { token }),
        update: (token, id, email, role) => ipcRenderer.invoke("user:update", { token, id, email, role }),
        delete: (token, id) => ipcRenderer.invoke("user:delete", { token, id }),
    },
    receipt: {
        create: (payload) => ipcRenderer.invoke("receipt:create", payload),
        getBySalesPerson: (token) => ipcRenderer.invoke("receipt:getBySalesPerson", { token }),
        getAll: (token) => ipcRenderer.invoke("receipt:getAll", { token }),
        search: (token, startDate, endDate, productName, salesPersonId) => ipcRenderer.invoke("receipt:search", { token, startDate, endDate, productName, salesPersonId }),
        createManualReceipt: (payload) => ipcRenderer.invoke("receipt:create-manual", payload),
        getAllManual: (payload) => ipcRenderer.invoke("receipt:getAllManual", payload),
        getDailyManualBySalesPerson: (token, limit = 20, offset = 0) => ipcRenderer.invoke("receipt:getDailyManualBySalesPerson", { token, limit, offset }),
        searchManual: (payload) => ipcRenderer.invoke("receipt:searchManual", payload),
    },
    product: {
        create: (token, name, price, type, sizeOptions) => ipcRenderer.invoke("product:create", { token, name, price, type, sizeOptions }),
        getAll: (token) => ipcRenderer.invoke("product:getAll", { token }),
        update: (token, id, name, price, type, sizeOptions) => ipcRenderer.invoke("product:update", { token, id, name, price, type, sizeOptions }),
        delete: (token, id) => ipcRenderer.invoke("product:delete", { token, id }),
    },
    companyProfile: {
        get: (token) => ipcRenderer.invoke("companyProfile:get", { token }),
        update: (token, name, address, phone, tax_rate) => ipcRenderer.invoke("companyProfile:update", { token, name, address, phone, tax_rate }),
    },
});
// ---------- Printer API ----------
contextBridge.exposeInMainWorld("printer", {
    listDevices: async () => ipcRenderer.invoke("printer:list"),
    selectPrinter: async (type, printerName) => ipcRenderer.invoke("printer:select", { type, printerName }),
    isConnected: async () => ipcRenderer.invoke("printer:isConnected"),
    printReceipt: async (receiptData) => ipcRenderer.invoke("printer:printReceipt", receiptData),
    generatePreview: async (receiptData) => ipcRenderer.invoke("printer:generatePreview", receiptData),
    generateManualPreview: async (receiptData) => ipcRenderer.invoke("printer:generateManualPreview", receiptData),
    onPrinterStatus: (callback) => {
        const subscription = (_event, status) => callback(status);
        ipcRenderer.on("printer:status", subscription);
        return () => ipcRenderer.removeListener("printer:status", subscription);
    },
});
// ---------- Google Drive + Backup APIs ----------
contextBridge.exposeInMainWorld("driveAPI", {
    backup: () => ipcRenderer.invoke("google-drive-backup"),
    authorize: () => ipcRenderer.invoke("google-drive-authorize"),
    completeAuth: (authCode) => ipcRenderer.invoke("google-drive-complete-auth", authCode),
});
contextBridge.exposeInMainWorld("backupAPI", {
    sendEmailBackup: async () => {
        try {
            const result = await ipcRenderer.invoke("backup:email");
            return { success: true, message: result };
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    },
});
//# sourceMappingURL=preload.js.map