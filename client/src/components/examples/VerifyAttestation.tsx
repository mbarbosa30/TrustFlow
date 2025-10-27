import { VerifyAttestation } from '../VerifyAttestation'

export default function VerifyAttestationExample() {
  return (
    <div className="max-w-5xl">
      <VerifyAttestation
        onVerify={async (attestation) => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return {
            valid: true,
            level: "Journeyer" as const,
            score: 1.73,
            epochId: "2025-10-27T12:00:00Z",
            subject: "user:0xabc...",
            policy: "advogato-v1",
          };
        }}
      />
    </div>
  )
}
