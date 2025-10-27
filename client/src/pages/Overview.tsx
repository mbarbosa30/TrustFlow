import { ScoreCard } from "@/components/ScoreCard";
import { EndorseForm } from "@/components/EndorseForm";
import { EndorsementsList } from "@/components/EndorsementsList";
import { type TrustLevel } from "@/components/TrustLevelBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Overview() {
  // TODO: remove mock functionality
  const mockData = {
    tier: "Master" as const,
    sts: 85,
    percentile: 92,
    minCutSize: 3,
    epochTimestamp: "2025-10-27T12:00:00Z",
  };

  const mockGivenEndorsements = [
    {
      id: "1",
      endorsee: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      level: "Trusted" as const,
      date: "2025-10-20T10:00:00Z",
      commitment: "0x8f5d9e2a1b3c4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f",
    },
    {
      id: "2",
      endorsee: "alice.eth",
      level: "Known" as const,
      date: "2025-10-15T14:30:00Z",
      commitment: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    },
    {
      id: "3",
      endorsee: "0x1234567890abcdef1234567890abcdef12345678",
      level: "Human" as const,
      date: "2025-10-10T08:15:00Z",
      commitment: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    },
  ];

  const mockReceivedEndorsements = [
    {
      id: "r1",
      endorsee: "0x987fEdCbA6543210987fEdCbA6543210987fEdCb",
      level: "Trusted" as const,
      date: "2025-10-25T16:20:00Z",
      commitment: "0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
    },
    {
      id: "r2",
      endorsee: "bob.eth",
      level: "Known" as const,
      date: "2025-10-18T09:45:00Z",
      commitment: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c",
    },
    {
      id: "r3",
      endorsee: "charlie.eth",
      level: "Trusted" as const,
      date: "2025-10-12T11:30:00Z",
      commitment: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
    },
    {
      id: "r4",
      endorsee: "0xaBcDeF1234567890aBcDeF1234567890aBcDeF12",
      level: "Human" as const,
      date: "2025-10-08T14:15:00Z",
      commitment: "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e",
    },
    {
      id: "r5",
      endorsee: "diana.eth",
      level: "Known" as const,
      date: "2025-10-05T08:00:00Z",
      commitment: "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
    },
  ];

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

  const handleEndorse = (endorsee: string, level: TrustLevel, note?: string) => {
    // TODO: remove mock functionality
    console.log('Creating endorsement:', { endorsee, level, note });
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
          />
        </div>

        <Card data-testid="card-endorse-form">
          <CardHeader>
            <CardTitle>Give Endorsement</CardTitle>
            <CardDescription>
              Endorse others in the network to increase their trust score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EndorseForm onEndorse={handleEndorse} />
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-endorsements">
        <CardHeader>
          <CardTitle>Endorsements</CardTitle>
          <CardDescription>
            Manage your given and received endorsements. Endorsements are private by default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="given" data-testid="tabs-endorsements">
            <TabsList className="grid w-full grid-cols-2" data-testid="tabs-list-endorsements">
              <TabsTrigger value="given" data-testid="tab-given">
                Given ({mockGivenEndorsements.length})
              </TabsTrigger>
              <TabsTrigger value="received" data-testid="tab-received">
                Received ({mockReceivedEndorsements.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="given" className="mt-6" data-testid="tab-content-given">
              <EndorsementsList
                endorsements={mockGivenEndorsements}
                onRevoke={handleRevoke}
                emptyMessage="You haven't given any endorsements yet"
                showRevokeButton={true}
              />
            </TabsContent>
            <TabsContent value="received" className="mt-6" data-testid="tab-content-received">
              <EndorsementsList
                endorsements={mockReceivedEndorsements}
                emptyMessage="You haven't received any endorsements yet"
                showRevokeButton={false}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
