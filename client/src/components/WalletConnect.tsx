import { Button } from "@/components/ui/button";
import { Wallet, Mail, Smartphone } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface WalletConnectProps {
  onConnect?: (address: string) => void;
}

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();

  useEffect(() => {
    if (isConnected && address && onConnect) {
      onConnect(address);
    }
  }, [isConnected, address, onConnect]);

  const handleConnect = () => {
    const waapConnector = connectors.find(c => c.id === 'waap');
    const targetConnector = waapConnector || connectors[0];
    
    if (targetConnector) {
      connect({ connector: targetConnector }, {
        onSuccess: () => {
          toast({
            title: "Wallet Connected",
            description: targetConnector.id === 'waap' 
              ? "Successfully connected with WaaP" 
              : "Successfully connected your wallet",
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

  const handleDisconnect = async () => {
    // Call WaaP's logout directly if using WaaP connector
    if (connector?.id === 'waap') {
      try {
        // @ts-ignore - WaaP connector has logout method
        await connector.logout();
      } catch (error) {
        console.warn('Error calling WaaP logout:', error);
      }
    }
    
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

  const waapConnector = connectors.find(c => c.id === 'waap');
  const isWaaPAvailable = !!waapConnector;

  return (
    <Button
      onClick={handleConnect}
      disabled={isPending}
      className="gap-2"
      data-testid="button-connect-wallet"
    >
      {isWaaPAvailable ? (
        <>
          <Mail className="w-4 h-4" />
          {isPending ? "Connecting..." : "Connect"}
        </>
      ) : (
        <>
          <Wallet className="w-4 h-4" />
          {isPending ? "Connecting..." : "Connect Wallet"}
        </>
      )}
    </Button>
  );
}
