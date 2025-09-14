const { contextBridge, ipcRenderer, IpcRendererEvent } = require("electron");

// ---------- Shared Types ----------
type ReceiptItem = {
  productName: string;
  price: number;
  quantity: number;
  size?: string;
};

type ReceiptData = {
  token: string;
  total: number;
  items: ReceiptItem[];
};

type PrinterStatus = { connected: boolean; device?: string };

// ---------- IPC Renderer Wrapper ----------
contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, func: (...args: any[]) => void) => {
      const subscription = (_event: typeof IpcRendererEvent, ...args: any[]) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    removeListener: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, func);
    },
  },
});

// ---------- User / Receipt / Product / Company APIs ----------
contextBridge.exposeInMainWorld("api", {
  user: {
    create: (token: string, email: string, password: string, role: "admin" | "sales_person") =>
      ipcRenderer.invoke("user:create", { token, email, password, role }),
    login: (email: string, password: string) =>
      ipcRenderer.invoke("user:login", { email, password }),
    logout: (token: string) => ipcRenderer.invoke("user:logout", { token }),
    getAll: (token: string) => ipcRenderer.invoke("user:getAll", { token }),
    update: (token: string, id: number, email: string, role: "admin" | "sales_person") =>
      ipcRenderer.invoke("user:update", { token, id, email, role }),
    delete: (token: string, id: number) => ipcRenderer.invoke("user:delete", { token, id }),
  },

  receipt: {
    create: (payload: ReceiptData) => ipcRenderer.invoke("receipt:create", payload),
    getBySalesPerson: (token: string) =>
      ipcRenderer.invoke("receipt:getBySalesPerson", { token }),
    getAll: (token: string) => ipcRenderer.invoke("receipt:getAll", { token }),
    search: (token: string, startDate?: string, endDate?: string, productName?: string, salesPersonId?: number) =>
      ipcRenderer.invoke("receipt:search", { token, startDate, endDate, productName, salesPersonId }),
    createManualReceipt: (payload: { token: string; receiptData: any }) =>
      ipcRenderer.invoke("receipt:create-manual", payload),
    getAllManual: (payload: { token: string; limit: number; offset: number }) =>
      ipcRenderer.invoke("receipt:getAllManual", payload),
    getDailyManualBySalesPerson: (token: string, limit: number = 20, offset: number = 0) =>
      ipcRenderer.invoke("receipt:getDailyManualBySalesPerson", { token, limit, offset }),
    searchManual: (payload: any) => ipcRenderer.invoke("receipt:searchManual", payload),
  },

  product: {
    create: (token: string, name: string, price: number, type: string, sizeOptions?: string) =>
      ipcRenderer.invoke("product:create", { token, name, price, type, sizeOptions }),
    getAll: (token: string) => ipcRenderer.invoke("product:getAll", { token }),
    update: (token: string, id: number, name: string, price: number, type: string, sizeOptions?: string) =>
      ipcRenderer.invoke("product:update", { token, id, name, price, type, sizeOptions }),
    delete: (token: string, id: number) => ipcRenderer.invoke("product:delete", { token, id }),
  },
  companyProfile: {
    get: (token: string) => ipcRenderer.invoke("companyProfile:get", { token }),
    update: (token: string, name: string, address: string, phone: string, tax_rate: number) =>
      ipcRenderer.invoke("companyProfile:update", { token, name, address, phone, tax_rate }),
  },
});

// ---------- Printer API ----------
contextBridge.exposeInMainWorld("printer", {
  listDevices: async (): Promise<{ success: boolean; devices?: { name: string }[]; error?: string }> =>
    ipcRenderer.invoke("printer:list"),

  selectPrinter: async (type: "epson" | "star", printerName: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("printer:select", { type, printerName }),

  isConnected: async (): Promise<boolean> => ipcRenderer.invoke("printer:isConnected"),

  printReceipt: async (receiptData: ReceiptData): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("printer:printReceipt", receiptData),

  generatePreview: async (receiptData: ReceiptData): Promise<{ success: boolean; content?: string; error?: string }> =>
    ipcRenderer.invoke("printer:generatePreview", receiptData),

  generateManualPreview: async (receiptData: any): Promise<{ success: boolean; content?: string; error?: string }> =>
    ipcRenderer.invoke("printer:generateManualPreview", receiptData),

  onPrinterStatus: (callback: (status: PrinterStatus) => void) => {
    const subscription = (_event: typeof IpcRendererEvent, status: PrinterStatus) => callback(status);
    ipcRenderer.on("printer:status", subscription);
    return () => ipcRenderer.removeListener("printer:status", subscription);
  },
});

// ---------- Google Drive + Backup APIs ----------
contextBridge.exposeInMainWorld("driveAPI", {
  backup: () => ipcRenderer.invoke("google-drive-backup"),
  authorize: () => ipcRenderer.invoke("google-drive-authorize"),
  completeAuth: (authCode: string) => ipcRenderer.invoke("google-drive-complete-auth", authCode),
});

contextBridge.exposeInMainWorld("backupAPI", {
  sendEmailBackup: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await ipcRenderer.invoke("backup:email");
      return { success: true, message: result };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },
});
