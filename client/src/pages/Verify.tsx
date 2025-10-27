import { VerifyAttestation } from "@/components/VerifyAttestation";

export default function Verify() {
  const handleVerify = async (attestation: string) => {
    // TODO: remove mock functionality
    console.log('Verifying attestation:', attestation);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const parsed = JSON.parse(attestation);
      return {
        valid: true,
        level: parsed.level,
        score: parsed.score,
        epochId: parsed.epoch,
        subject: parsed.sub,
        policy: parsed.policy,
      };
    } catch (error) {
      return { valid: false };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Verify Attestation</h1>
        <p className="text-muted-foreground">
          Paste a trust attestation to verify its signature and check recency
        </p>
      </div>

      <VerifyAttestation onVerify={handleVerify} />
    </div>
  );
}
