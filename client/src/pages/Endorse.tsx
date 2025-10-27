import { EndorseForm } from "@/components/EndorseForm";
import { type TrustLevel } from "@/components/TrustLevelBadge";

export default function Endorse() {
  const handleEndorse = (endorsee: string, level: TrustLevel, note?: string) => {
    // TODO: remove mock functionality
    console.log('Creating endorsement:', { endorsee, level, note });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Endorse</h1>
        <p className="text-muted-foreground">
          Endorse others in the network to increase their trust score
        </p>
      </div>

      <div className="max-w-2xl">
        <EndorseForm onEndorse={handleEndorse} />
      </div>
    </div>
  );
}
