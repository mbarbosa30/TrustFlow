import { ScoreCard } from "@/components/ScoreCard";
import { EndorseForm } from "@/components/EndorseForm";
import { EndorsementsList } from "@/components/EndorsementsList";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import type { PublicEndorsement } from "@shared/schema";

export default function Overview() {
  const { address, isConnected } = useAccount();
  
  const mockData = {
    tier: "Master" as const,
    sts: 85,
    percentile: 92,
    minCutSize: 3,
    epochTimestamp: "2025-10-27T12:00:00Z",
  };

  const { data: confidenceData } = useQuery<{
    did: string;
    epoch: number;
    trust: { sts: number; flow: number; mincut: number };
    confidence: {
      percent: number;
      global: { GHI: number; sizeN: number; cutN: number; churnN: number };
      local: { mincutN: number };
    };
  }>({
    queryKey: ['/api/score', address || 'default'],
    enabled: isConnected && !!address,
  });

  const { data: givenEndorsementsData, isLoading: isLoadingGiven } = useQuery<{ endorsements: PublicEndorsement[] }>({
    queryKey: ['/api/endorsements', { endorser: address }],
    enabled: isConnected && !!address,
  });

  const { data: receivedEndorsementsData, isLoading: isLoadingReceived } = useQuery<{ endorsements: PublicEndorsement[] }>({
    queryKey: ['/api/endorsements', { endorsee: address }],
    enabled: isConnected && !!address,
  });

  const givenEndorsements = givenEndorsementsData?.endorsements.map(e => ({
    id: e.id.toString(),
    endorsee: e.endorsee,
    date: e.createdAt.toISOString(),
    commitment: e.leafHash,
  })) || [];

  const receivedEndorsements = receivedEndorsementsData?.endorsements.map(e => ({
    id: e.id.toString(),
    endorsee: e.endorser,
    date: e.createdAt.toISOString(),
    commitment: e.leafHash,
  })) || [];

  const handleExport = () => {
    const attestation = {
      sub: "user:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      tier: mockData.tier,
      sts: mockData.sts,
      percentile: mockData.percentile,
      minCut: mockData.minCutSize,
      epoch: mockData.epochTimestamp,
      policy: "advogato-v1",
      roots: {
        graph: "0x8f5d9e2a...",
        seed: "0x1a2b3c4d...",
        params: "0xabcdef12...",
      },
      iss: "trustflow.app",
      sig: "ed25519:...",
    };
    
    navigator.clipboard.writeText(JSON.stringify(attestation, null, 2));
    console.log('Exported attestation:', attestation);
  };

  const handleEndorse = async (endorsee: string, note?: string) => {
    console.log('Vouch created:', { endorsee, note });
  };

  const handleRevoke = (id: string) => {
    // TODO: remove mock functionality
    console.log('Revoking endorsement:', id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Overview</h1>
        <p className="text-muted-foreground">
          Your personal trust hub: view your score, give endorsements, and manage your network
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div>
          <ScoreCard
            tier={mockData.tier}
            sts={mockData.sts}
            percentile={mockData.percentile}
            minCutSize={mockData.minCutSize}
            epochTimestamp={mockData.epochTimestamp}
            onExportAttestation={handleExport}
            confidence={
              confidenceData
                ? {
                    percent: confidenceData.confidence.percent,
                    ghi: confidenceData.confidence.global.GHI,
                    localMincutN: confidenceData.confidence.local.mincutN,
                  }
                : undefined
            }
          />
        </div>

        <div>
          <EndorseForm onEndorse={handleEndorse} />
        </div>
      </div>

      <Card data-testid="card-endorsements">
        <CardHeader>
          <CardTitle>Vouches</CardTitle>
          <CardDescription>
            Manage your given and received vouches. Vouches are public and verifiable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="given" data-testid="tabs-endorsements">
            <TabsList className="grid w-full grid-cols-2" data-testid="tabs-list-endorsements">
              <TabsTrigger value="given" data-testid="tab-given">
                Given ({isLoadingGiven ? '...' : givenEndorsements.length})
              </TabsTrigger>
              <TabsTrigger value="received" data-testid="tab-received">
                Received ({isLoadingReceived ? '...' : receivedEndorsements.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="given" className="mt-6" data-testid="tab-content-given">
              {isLoadingGiven ? (
                <div className="text-center text-muted-foreground py-8">Loading vouches...</div>
              ) : (
                <EndorsementsList
                  endorsements={givenEndorsements}
                  onRevoke={handleRevoke}
                  emptyMessage={isConnected ? "You haven't vouched for anyone yet" : "Connect your wallet to view vouches"}
                  showRevokeButton={true}
                />
              )}
            </TabsContent>
            <TabsContent value="received" className="mt-6" data-testid="tab-content-received">
              {isLoadingReceived ? (
                <div className="text-center text-muted-foreground py-8">Loading vouches...</div>
              ) : (
                <EndorsementsList
                  endorsements={receivedEndorsements}
                  emptyMessage={isConnected ? "You haven't received any vouches yet" : "Connect your wallet to view vouches"}
                  showRevokeButton={false}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
