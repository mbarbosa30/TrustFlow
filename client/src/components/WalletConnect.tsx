import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";

interface WalletConnectProps {
  onConnect?: (address: string) => void;
}

declare global {
  interface Window {
    waap?: any;
    __waapInited?: boolean;
  }
}

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const { address, setAddress: setGlobalAddress } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const restoreSession = async () => {
      if (!window.waap || !window.__waapInited) {
        return;
      }

      try {
        const accounts = await window.waap.request({ method: 'eth_accounts' }) as string[];
        if (accounts && accounts.length > 0) {
          setGlobalAddress(accounts[0]);
        }
      } catch (error) {
        console.log("No existing session to restore");
      }
    };

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        setGlobalAddress(accounts[0]);
      } else {
        setGlobalAddress(null);
      }
    };

    if (window.waap) {
      window.waap.on?.('accountsChanged', handleAccountsChanged);
    }

    restoreSession();

    return () => {
      if (window.waap) {
        window.waap.removeListener?.('accountsChanged', handleAccountsChanged);
      }
    };
  }, [setGlobalAddress]);

  useEffect(() => {
    if (address && onConnect) {
      onConnect(address);
    }
  }, [address, onConnect]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      if (!window.waap) {
        throw new Error("WaaP not initialized");
      }

      const loginType = await window.waap.login();
      if (!loginType) {
        return;
      }

      const accounts = await window.waap.request({ method: 'eth_requestAccounts' }) as string[];
      if (accounts && accounts.length > 0) {
        setGlobalAddress(accounts[0]);
        toast({
          title: "Wallet Connected",
          description: `Connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
        });
      }
    } catch (error: any) {
      console.error("Connection error:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (!window.waap) {
        setGlobalAddress(null);
        return;
      }

      // Smart logout: handle different wallet types appropriately
      const loginMethod = window.waap.getLoginMethod?.() || null;

      // Clear app state first
      setGlobalAddress(null);

      if (loginMethod === 'waap' || loginMethod === 'walletconnect') {
        // WaaP and WalletConnect can be programmatically logged out
        await window.waap.logout();
        
        // Also clear WalletConnect v2 localStorage if present
        Object.keys(localStorage)
          .filter(k => k.startsWith('wc@2:'))
          .forEach(k => localStorage.removeItem(k));

        toast({
          title: "Disconnected",
          description: "Your wallet has been disconnected",
        });
      } else if (loginMethod === 'injected') {
        // Injected wallets (MetaMask, etc.) need manual disconnect
        await window.waap.logout(); // Clear WaaP app session
        
        toast({
          title: "Disconnected from App",
          description: "To fully disconnect, open your wallet extension > Connected Sites > remove this site",
        });
      } else {
        // No active session, just clear state
        toast({
          title: "Disconnected",
          description: "Your wallet has been disconnected",
        });
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Disconnect Error",
        description: "There was an issue disconnecting. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  if (address) {
    return (
      <Button
        variant="outline"
        onClick={handleDisconnect}
        className="font-mono"
        data-testid="button-disconnect-wallet"
      >
        {address.substring(0, 6)}...{address.substring(address.length - 4)}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting}
      className="gap-2"
      data-testid="button-connect-wallet"
    >
      <Mail className="w-4 h-4" />
      {isConnecting ? "Connecting..." : "Connect"}
    </Button>
  );
}
