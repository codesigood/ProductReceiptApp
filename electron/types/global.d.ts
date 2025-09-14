export {};

declare global {
  interface User {
    id: number;
    email: string;
    role: "admin" | "sales_person";
  }

  interface Window {
    api: {
      companyProfile: any;
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
      };
     receipt: {
        getDailyManualBySalesPerson(token: string): unknown;
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
        ) => Promise<{ success: boolean; data?: any; message?: string }>;

        getAll: (
          token: string
        ) => Promise<{ success: boolean; data?: any; message?: string }>;

        search: (
          token: string,
          startDate?: string,
          endDate?: string,
          productName?: string,
          salesPersonId?: number
        ) => Promise<{ success: boolean; data?: any; message?: string }>;
      };
    };
    printer: {
      listDevices(): unknown;
      selectPrinter(arg0: string, selectedPrinterName: string): unknown;
      generateManualPreview(receiptData: { cashier: string; name: string; weight: number; sg: number; goldKarat: string; amount: number; createdAt: Date; transactionCode: string; }): unknown;
      isConnected: () => Promise<boolean>;
      printReceipt: (receiptData: any) => Promise<any>;
    };
  }
}