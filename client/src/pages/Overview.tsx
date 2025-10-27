import { ScoreCard } from "@/components/ScoreCard";

export default function Overview() {
  // TODO: remove mock functionality
  const mockData = {
    level: "Journeyer" as const,
    score: 1.73,
    minCutSize: 3,
    epochTimestamp: "2025-10-27T12:00:00Z",
  };

  const handleExport = () => {
    const attestation = {
      sub: "user:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      level: mockData.level,
      score: mockData.score,
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Overview</h1>
        <p className="text-muted-foreground">
          Your current trust level and score in the network
        </p>
      </div>

      <div className="max-w-md">
        <ScoreCard
          level={mockData.level}
          score={mockData.score}
          minCutSize={mockData.minCutSize}
          epochTimestamp={mockData.epochTimestamp}
          onExportAttestation={handleExport}
        />
      </div>
    </div>
  );
}
