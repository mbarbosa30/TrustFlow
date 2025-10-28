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

  // On mount, check if WaaP already has an active session (auto-reconnect)
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        // Guard against HMR double-initialization
        if (window.__waapInited) {
          // WaaP already initialized, check if connected
          if (window.ethereum) {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
            if (accounts && accounts.length > 0) {
              setGlobalAddress(accounts[0]);
            }
          }
          return;
        }

        // Initialize WaaP once
        const { initWaaP } = await import("@human.tech/waap-sdk");
        const { waapConfig } = await import("@/lib/waap.config");
        
        await initWaaP(waapConfig);
        window.__waapInited = true;

        // Check if there's an existing session (auto-reconnect)
        if (window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
          if (accounts && accounts.length > 0) {
            setGlobalAddress(accounts[0]);
          }
        }
      } catch (error) {
        console.error("Error checking WaaP connection:", error);
      }
    };

    checkExistingConnection();
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

      // Optional: clear any previous session for a fresh start
      try {
        await window.waap.logout();
      } catch (e) {
        // Ignore logout errors
      }

      // Open WaaP login modal (user chooses auth method)
      const loginType = await window.waap.login();
      if (!loginType) {
        // User cancelled
        return;
      }

      // Request accounts only after successful login
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
