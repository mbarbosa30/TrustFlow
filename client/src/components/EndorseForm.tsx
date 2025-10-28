import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from '@/contexts/WalletContext';
import { apiRequest } from "@/lib/queryClient";
import { normalize } from 'viem/ens';
import type { Address } from 'viem';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface EndorseFormProps {
  onEndorse?: (endorsee: string, note?: string) => void;
}

const ENDORSEMENT_DOMAIN = {
  name: "TrustFlow",
  version: "1",
} as const;

const ENDORSEMENT_TYPES = {
  Endorsement: [
    { name: "endorser", type: "address" },
    { name: "endorsee", type: "address" },
    { name: "epoch", type: "uint64" },
    { name: "nonce", type: "uint64" },
  ],
} as const;

export function EndorseForm({ onEndorse }: EndorseFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolvingENS, setIsResolvingENS] = useState(false);
  const { toast } = useToast();
  const { address, isConnected } = useWallet();
  
  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(),
  });

  const resolveENSName = async (nameOrAddress: string): Promise<Address> => {
    if (nameOrAddress.toLowerCase().startsWith('0x')) {
      return nameOrAddress as Address;
    }

    if (!publicClient) {
      throw new Error("Unable to resolve ENS: Ethereum mainnet connection required");
    }

    try {
      setIsResolvingENS(true);
      const normalizedName = normalize(nameOrAddress);
      const resolvedAddress = await publicClient.getEnsAddress({
        name: normalizedName,
      });

      if (!resolvedAddress) {
        throw new Error(`ENS name "${nameOrAddress}" not found or not configured`);
      }

      return resolvedAddress;
    } catch (error: any) {
      throw new Error(`Failed to resolve ENS name: ${error.message}`);
    } finally {
      setIsResolvingENS(false);
    }
  };

  const handleSubmit = async () => {
    if (!searchQuery || !address || !isConnected) return;
    
    setIsSubmitting(true);
    
    try {
      const endorseeAddress = await resolveENSName(searchQuery);

      const epoch = BigInt(0);

      const nonceResponse = await fetch(`/api/nonce/${address}/${epoch}`);
      if (!nonceResponse.ok) {
        throw new Error("Failed to fetch nonce");
      }
      const nonceData = await nonceResponse.json();
      const nonce = BigInt(nonceData.nextNonce);

      const message = {
        endorser: address,
        endorsee: endorseeAddress,
        epoch,
        nonce,
      };

      // Use already-initialized WaaP instance
      if (!window.ethereum) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }
      
      // Request account authorization first
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      if (!accounts || accounts.length === 0) {
        throw new Error("No wallet account available");
      }
      
      // Convert BigInt to string for JSON serialization
      const messageForSigning = {
        endorser: address,
        endorsee: endorseeAddress,
        epoch: epoch.toString(),
        nonce: nonce.toString(),
      };
      
      const typedData = {
        domain: ENDORSEMENT_DOMAIN,
        types: ENDORSEMENT_TYPES,
        primaryType: 'Endorsement',
        message: messageForSigning,
      };

      console.log("Signing with domain:", JSON.stringify(ENDORSEMENT_DOMAIN, null, 2));
      console.log("Signing message:", JSON.stringify(messageForSigning, null, 2));
      
      const signature = await window.ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [
          address,
          JSON.stringify(typedData),
        ],
      }) as string;

      console.log("Signature created:", signature);

      await apiRequest('POST', '/api/endorse', {
        endorser: address,
        endorsee: endorseeAddress,
        epoch: epoch.toString(),
        nonce: nonce.toString(),
        sig: signature,
      });

      if (onEndorse) {
        onEndorse(searchQuery, note || undefined);
      }
      
      toast({
        title: "Endorsement Created",
        description: `You vouched for ${searchQuery}`,
      });
      
      setSearchQuery("");
      setNote("");
    } catch (error: any) {
      toast({
        title: "Failed to Create Endorsement",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card data-testid="card-endorse-form">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Vouch for Someone in the Network</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="search-address">Wallet Address or ENS</Label>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="search-address"
              placeholder="0x1234... or name.eth"
              className="pl-9 h-12 font-mono"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-address"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="note">Private Note (Optional)</Label>
          <Textarea
            id="note"
            placeholder="Why you vouch for this person..."
            className="mt-2 resize-none"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            data-testid="input-note"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Stored locally, never sent to server
          </p>
        </div>

        <Button
          className="w-full h-12"
          disabled={!searchQuery || !isConnected || isSubmitting || isResolvingENS}
          onClick={handleSubmit}
          data-testid="button-submit-endorsement"
        >
          {isResolvingENS ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Resolving ENS Name...
            </>
          ) : isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Vouch...
            </>
          ) : !isConnected ? (
            "Connect Wallet to Vouch"
          ) : (
            "Vouch for This Person"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
