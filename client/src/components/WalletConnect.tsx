import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { initWaaP } from "@human.tech/waap-sdk";
import { waapConfig } from "@/lib/waap.config";

interface WalletConnectProps {
  onConnect?: (address: string) => void;
}

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  // Clear all WaaP session data on mount to prevent auto-connect
  useEffect(() => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('waap') || key.startsWith('silk') || key.startsWith('wc@') || key.includes('walletconnect'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('Cleared:', key);
    });
  }, []);

  useEffect(() => {
    if (address && onConnect) {
      onConnect(address);
    }
  }, [address, onConnect]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const waap = await initWaaP(waapConfig);
      await waap.login();
      const accounts = await waap.request({ method: 'eth_requestAccounts' }) as string[];
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        toast({
          title: "Wallet Connected",
          description: "Successfully connected with WaaP",
        });
      }
    } catch (error: any) {
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
      const waap = await initWaaP(waapConfig);
      await waap.logout();
      
      // Clear all WaaP-related localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('waap') || key.startsWith('silk') || key.includes('wallet'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      setAddress(null);
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected",
      });
    } catch (error) {
      console.warn('Error disconnecting:', error);
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
