import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAccount, useConnect, useDisconnect } from 'wagmi';

interface WalletConnectProps {
  onConnect?: (address: string) => void;
}

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();

  const handleConnect = () => {
    const injectedConnector = connectors[0];
    if (injectedConnector) {
      connect({ connector: injectedConnector }, {
        onSuccess: (data) => {
          const addr = data.accounts[0];
          toast({
            title: "Wallet Connected",
            description: `Connected: ${addr.slice(0, 6)}...${addr.slice(-4)}`,
          });
          if (onConnect) onConnect(addr);
        },
        onError: (error) => {
          toast({
            title: "Connection Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast({
      title: "Disconnected",
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
