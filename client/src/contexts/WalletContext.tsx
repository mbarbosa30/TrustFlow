import { createContext, useContext } from "react";
import { useWaaP } from "@/waap";

interface WalletContextType {
  address: string | null;
  setAddress: (address: string | null) => void;
  isConnected: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address } = useWaaP();

  return (
    <WalletContext.Provider value={{ address, setAddress: () => {}, isConnected: !!address }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
}
