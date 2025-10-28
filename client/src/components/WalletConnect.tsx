import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WalletConnectProps {
  onConnect?: (address: string) => void;
}

// Declare window.waap type
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

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  // Auto-reconnect on mount if user had a previous WaaP session
  useEffect(() => {
    const attemptAutoConnect = async () => {
      if (!window.waap) return;

      try {
        // Use eth_accounts (silent check, no modal)
        const accounts = await window.waap.request({ 
          method: 'eth_accounts' 
        });
        
        if (accounts && accounts.length > 0) {
          const addr = accounts[0];
          setAddress(addr);
          if (onConnect) onConnect(addr);
          console.log('Auto-reconnected to WaaP:', addr);
        }
      } catch (error) {
        // Silent fail - user probably doesn't have an active session
        console.log('No existing WaaP session');
      }
    };

    // Retry until WaaP is ready
    let attempts = 0;
    const maxAttempts = 10;
    const checkInterval = setInterval(() => {
      if (window.waap || attempts >= maxAttempts) {
        clearInterval(checkInterval);
        attemptAutoConnect();
      }
      attempts++;
    }, 300);

    return () => clearInterval(checkInterval);
  }, [onConnect]);

  // Listen for account changes - retry until WaaP is ready
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAddress(null);
      } else {
        const newAddr = accounts[0];
        setAddress(newAddr);
        if (onConnect) onConnect(newAddr);
      }
    };

    const handleDisconnect = () => {
      setAddress(null);
    };

    // Retry until WaaP is available to set up listeners
    const setupListeners = setInterval(() => {
      if (window.waap) {
        clearInterval(setupListeners);
        window.waap.on('accountsChanged', handleAccountsChanged);
        window.waap.on('disconnect', handleDisconnect);
      }
    }, 300);

    return () => {
      clearInterval(setupListeners);
      if (window.waap) {
        window.waap.removeListener('accountsChanged', handleAccountsChanged);
        window.waap.removeListener('disconnect', handleDisconnect);
      }
    };
  }, [onConnect]);

  const handleConnect = async () => {
    if (!window.waap) {
      toast({
        title: "WaaP Not Available",
        description: "Human Wallet is not initialized. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      // Open WaaP modal for login (email, phone, social, or wallet)
      await window.waap.login();
      
      // Get the connected account
      const accounts = await window.waap.request({ 
        method: 'eth_requestAccounts' 
      });

      if (accounts && accounts.length > 0) {
        const addr = accounts[0];
        setAddress(addr);
        toast({
          title: "Wallet Connected",
          description: `Connected: ${addr.slice(0, 6)}...${addr.slice(-4)}`,
        });
        if (onConnect) onConnect(addr);
      }
    } catch (error: any) {
      console.error('WaaP connection error:', error);
      toast({
        title: "Connection Failed",
        description: error?.message || "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.waap) return;

    try {
      await window.waap.logout();
      setAddress(null);
      
      toast({
        title: "Disconnected",
        description: "Your wallet has been disconnected",
      });
    } catch (error: any) {
      console.error('Disconnect error:', error);
      toast({
        title: "Disconnect Error",
        description: error?.message || "There was an issue disconnecting",
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
      <Wallet className="w-4 h-4" />
      {isConnecting ? "Connecting..." : "Sign In"}
    </Button>
  );
}
