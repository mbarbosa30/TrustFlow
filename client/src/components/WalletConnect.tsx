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

  const handleSwitchAccount = async () => {
    // Force logout and show login modal again
    if (connector?.id === 'waap') {
      try {
        // @ts-ignore - WaaP connector has logout method
        await connector.logout();
        disconnect();
        
        // Wait a bit for logout to complete, then reconnect to show modal
        setTimeout(() => {
          const waapConnector = connectors.find(c => c.id === 'waap');
          if (waapConnector) {
            connect({ connector: waapConnector });
          }
        }, 500);
      } catch (error) {
        console.warn('Error switching account:', error);
      }
    }
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={handleSwitchAccount}
          className="font-mono"
          data-testid="button-switch-account"
        >
          {address.substring(0, 6)}...{address.substring(address.length - 4)}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDisconnect}
          data-testid="button-disconnect-wallet"
        >
          ✕
        </Button>
      </div>
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
