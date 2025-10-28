// Global type declarations
declare global {
  interface Window {
    waap?: {
      login: () => Promise<void>;
      logout: () => Promise<void>;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

export {};
