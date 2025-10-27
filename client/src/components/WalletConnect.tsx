import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface WalletConnectProps {
  onConnect?: (address: string) => void;
}

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();

  useEffect(() => {
    if (isConnected && address && onConnect) {
      onConnect(address);
    }
  }, [isConnected, address, onConnect]);

  const handleConnect = () => {
    const connector = connectors[0];
    if (connector) {
      connect({ connector }, {
        onSuccess: () => {
          toast({
            title: "Wallet Connected",
            description: "Successfully connected your wallet",
          });
        },
        onError: (error) => {
          toast({
            title: "Connection Failed",
            description: error.message || "Failed to connect wallet",
            variant: "destructive",
          });
        },
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  if (isConnected && address) {
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
      disabled={isPending}
      className="gap-2"
      data-testid="button-connect-wallet"
    >
      <Wallet className="w-4 h-4" />
      {isPending ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}
