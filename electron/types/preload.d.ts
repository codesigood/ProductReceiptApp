export {};

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
      };
    };
    api: {
      user: {
        create: (email: string, password: string, role: "admin" | "sales_person") => Promise<any>;
        login: (email: string, password: string) => Promise<any>;
        logout: (token: string) => Promise<any>;
        getAll: () => Promise<any>;
        update: (id: number, email: string, role: "admin" | "sales_person") => Promise<any>;
        delete: (id: number) => Promise<any>;
      };
      receipt: {
        create: (payload: {
          token: string;
          total: number;
          items: Array<{ productName: string; price: number; quantity: number; size?: string }>;
        }) => Promise<any>;
        getBySalesPerson: (token: string) => Promise<any>;
        getAll: (token: string) => Promise<any>;
        search: (
          token: string,
          startDate?: string,
          endDate?: string,
          productName?: string,
          salesPersonId?: number
        ) => Promise<any>;
        createManualReceipt: (payload: { token: string, receiptData: any }) => Promise<any>;
        getAllManual: (token: string) => Promise<any>;
        getDailyManualBySalesPerson: (token: string) => Promise<any>;
        searchManual: (payload: { token: string, startDate?: string, endDate?: string, salesPersonId?: number }) => Promise<any>;
      };
      product: {
        create: (token: string, name: string, price: number, type: string, sizeOptions?: string) => Promise<any>;
        getAll: (token: string) => Promise<any>;
        update: (token: string, id: number, name: string, price: number, type: string, sizeOptions?: string) => Promise<any>;
        delete: (token: string, id: number) => Promise<any>;
      };
    };
    printer: {
      isConnected: () => Promise<boolean>;
      printReceipt: (receiptData: any) => Promise<any>;
      generatePreview: (receiptData: any) => Promise<any>;
      generateManualPreview: (receiptData: any) => Promise<any>;
      saveSettings: (type: string, connectionType: string, interfaceStr: string) => Promise<any>;
      getSettings: () => Promise<any>;
    };
  }
}