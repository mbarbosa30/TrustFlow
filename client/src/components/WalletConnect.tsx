import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWaaP } from "@/waap";
import { useState } from "react";

interface WalletConnectProps {
  onConnect?: (address: string) => void;
}

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const { ready, address, login, logout } = useWaaP();
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const connectedAddress = await login();
      
      if (connectedAddress) {
        toast({
          title: "Wallet Connected",
          description: `Connected: ${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`,
        });
        
        if (onConnect) {
          onConnect(connectedAddress);
        }
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
      await logout();
      toast({
        title: "Disconnected",
        description: "Your wallet has been disconnected",
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Disconnect Error",
        description: "There was an issue disconnecting. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  if (!ready) {
    return (
      <Button disabled className="gap-2" data-testid="button-connect-wallet">
        <Mail className="w-4 h-4" />
        Loading...
      </Button>
    );
  }

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
