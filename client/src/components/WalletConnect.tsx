import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface WalletConnectProps {
  onConnect?: (address: string) => void;
}

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const { toast } = useToast();

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      // Mock wallet connection for demo
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
      setAddress(mockAddress);
      
      if (onConnect) {
        onConnect(mockAddress);
      }
      
      toast({
        title: "Wallet Connected",
        description: "Successfully connected your wallet",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setAddress(null);
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
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
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}
