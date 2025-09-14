export {};

declare global {
  interface Window {
    api: {
      user: {
        login: (email: string, password: string) => Promise<any>;
      };
    };
  }
}
