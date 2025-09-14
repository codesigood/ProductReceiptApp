export {};

declare global {
  interface User {
    id: number;
    email: string;
    role: "admin" | "sales_person";
  }

  interface Window {
    electron: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
      };
    };
    api: {
      user: {
        create: (
          email: string,
          password: string,
          role: "admin" | "sales_person"
        ) => Promise<{ success: boolean; message?: string }>;

        login: (
          email: string,
          password: string
        ) => Promise<{
          success: boolean;
          token?: string;
          user?: User;
          message?: string;
        }>;

        logout: (token: string) => Promise<{ success: boolean }>;

        getAll: () => Promise<{ success: boolean; users?: User[]; message?: string }>;

        update: (
          id: number,
          email: string,
          role: "admin" | "sales_person"
        ) => Promise<{ success: boolean; message?: string }>;

        delete: (id: number) => Promise<{ success: boolean; message?: string }>;
      };

      receipt: {
        create: (payload: {
          token: string;
          total: number;
          items: Array<{
            productName: string;
            price: number;
            quantity: number;
            size?: string;
          }>;
        }) => Promise<{ success: boolean; message?: string }>;

        getBySalesPerson: (
          token: string
        ) => Promise<{ success: boolean; data?: any[]; message?: string }>;

        getAll: (
          token: string
        ) => Promise<{ success: boolean; data?: any[]; message?: string }>;

        search: (
          token: string,
          startDate?: string,
          endDate?: string,
          productName?: string,
          salesPersonId?: number
        ) => Promise<{ success: boolean; data?: any[]; message?: string }>;
      };
    };
    printer: {
      isConnected: () => Promise<boolean>;
      printReceipt: (receiptData: any) => Promise<any>;
      generatePreview: (receiptData: any) => Promise<{ success: boolean; content?: string; error?: string }>;
      saveSettings: (type: string, connectionType: string, interfaceStr: string) => Promise<{ success: boolean; message?: string }>;
      getSettings: () => Promise<{ success: boolean; settings?: { type: string; connectionType: string; interface: string } | null; message?: string }>;
    };
  }
}