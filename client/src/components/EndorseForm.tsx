import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TrustLevel } from "./TrustLevelBadge";
import { Search, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAccount, useSignTypedData } from 'wagmi';
import { apiRequest } from "@/lib/queryClient";
import type { Address } from 'viem';

interface EndorseFormProps {
  onEndorse?: (endorsee: string, level: TrustLevel, note?: string) => void;
}

const ENDORSEMENT_DOMAIN = {
  name: "TrustFlow",
  version: "1",
  chainId: 8453,
  verifyingContract: "0x0000000000000000000000000000000000000000" as Address,
} as const;

const ENDORSEMENT_TYPES = {
  Endorsement: [
    { name: "endorser", type: "address" },
    { name: "endorsee", type: "address" },
    { name: "level", type: "uint8" },
    { name: "epoch", type: "uint64" },
    { name: "nonce", type: "uint64" },
  ],
} as const;

const LEVEL_MAP: Record<TrustLevel, number> = {
  Human: 1,
  Known: 2,
  Trusted: 3,
};

export function EndorseForm({ onEndorse }: EndorseFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<TrustLevel | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  const levels: TrustLevel[] = ["Human", "Known", "Trusted"];
  
  const levelDescriptions: Record<TrustLevel, string> = {
    Human: "I believe this is a human (0.4 weight)",
    Known: "I know that person (0.7 weight)",
    Trusted: "I trust that person (1.0 weight)",
  };

  const handleSubmit = async () => {
    if (!searchQuery || !selectedLevel || !address || !isConnected) return;
    
    setIsSubmitting(true);
    
    try {
      const endorseeAddress = searchQuery.toLowerCase().startsWith('0x') 
        ? searchQuery as Address
        : searchQuery as Address;

      const epoch = BigInt(0);
      const level = LEVEL_MAP[selectedLevel];

      const nonceResponse = await fetch(`/api/endorsements?endorser=${address}&epoch=${epoch}`);
      const nonceData = await nonceResponse.json();
      const nonce = BigInt(nonceData.endorsements?.length || 0);

      const message = {
        endorser: address,
        endorsee: endorseeAddress,
        level,
        epoch,
        nonce,
      };

      const signature = await signTypedDataAsync({
        domain: ENDORSEMENT_DOMAIN,
        types: ENDORSEMENT_TYPES,
        primaryType: 'Endorsement',
        message,
      });

      await apiRequest('POST', '/api/endorse', {
        endorser: address,
        endorsee: endorseeAddress,
        level,
        epoch: epoch.toString(),
        nonce: nonce.toString(),
        sig: signature,
      });

      if (onEndorse) {
        onEndorse(searchQuery, selectedLevel, note || undefined);
      }
      
      toast({
        title: "Endorsement Created",
        description: `You endorsed ${searchQuery} as ${selectedLevel}`,
      });
      
      setSearchQuery("");
      setSelectedLevel(null);
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
        <CardTitle className="text-lg font-semibold">Endorse User</CardTitle>
        <p className="text-sm text-muted-foreground">
          Select a trust level and endorse someone in the network
        </p>
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
          <Label>Trust Level</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {levels.map((level) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`p-4 rounded-lg border-2 text-left transition-all hover-elevate ${
                  selectedLevel === level
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
                data-testid={`button-level-${level.toLowerCase()}`}
              >
                <div className="font-semibold text-sm mb-1">{level}</div>
                <div className="text-xs text-muted-foreground">
                  {levelDescriptions[level]}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="note">Private Note (Optional)</Label>
          <Textarea
            id="note"
            placeholder="Why you trust this person..."
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
          disabled={!searchQuery || !selectedLevel || !isConnected || isSubmitting}
          onClick={handleSubmit}
          data-testid="button-submit-endorsement"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : !isConnected ? (
            "Connect Wallet to Endorse"
          ) : (
            "Create Endorsement"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
