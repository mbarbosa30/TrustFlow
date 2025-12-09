import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { CheckCircle2, XCircle, Shield } from "lucide-react";
import { ScoreLevelBadge, type ScoreLevel } from "./TrustLevelBadge";

interface VerificationResult {
  valid: boolean;
  level?: ScoreLevel;
  score?: number;
  epochId?: string;
  subject?: string;
  policy?: string;
}

interface VerifyAttestationProps {
  onVerify?: (attestation: string) => Promise<VerificationResult>;
}

export function VerifyAttestation({ onVerify }: VerifyAttestationProps) {
  const [attestation, setAttestation] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    
    try {
      if (onVerify) {
        const res = await onVerify(attestation);
        setResult(res);
      } else {
        // Mock verification for demo
        const mockAttestation = JSON.parse(attestation);
        setResult({
          valid: true,
          level: mockAttestation.level,
          score: mockAttestation.score,
          epochId: mockAttestation.epoch,
          subject: mockAttestation.sub,
          policy: mockAttestation.policy,
        });
      }
    } catch (error) {
      setResult({ valid: false });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card data-testid="card-verify-input">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Paste Attestation</CardTitle>
          <p className="text-sm text-muted-foreground">
            Verify a signed trust attestation
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="attestation">Trust Attestation (JSON)</Label>
            <Textarea
              id="attestation"
              className="mt-2 font-mono text-sm h-64 resize-none"
              placeholder='{"sub":"user:0xabc...","level":"Journeyer",...}'
              value={attestation}
              onChange={(e) => setAttestation(e.target.value)}
              data-testid="input-attestation"
            />
          </div>
          <Button
            className="w-full"
            onClick={handleVerify}
            disabled={!attestation || isVerifying}
            data-testid="button-verify"
          >
            {isVerifying ? "Verifying..." : "Verify Attestation"}
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="card-verify-result">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Verification Result</CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Paste and verify an attestation to see results</p>
            </div>
          ) : result.valid ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2" style={{ color: 'hsl(var(--score-growth))' }}>
                <CheckCircle2 className="w-6 h-6" />
                <span className="font-semibold text-lg">Valid Attestation</span>
              </div>
              
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground mb-1">Score Level</dt>
                  <dd data-testid="text-result-level">
                    {result.level && <ScoreLevelBadge level={result.level} />}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-muted-foreground mb-1">Score</dt>
                  <dd className="text-2xl font-bold" data-testid="text-result-score">
                    {result.score?.toFixed(2)}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-muted-foreground mb-1">Subject</dt>
                  <dd className="font-mono text-xs break-all" data-testid="text-result-subject">
                    {result.subject}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-muted-foreground mb-1">Epoch</dt>
                  <dd className="font-mono text-xs" data-testid="text-result-epoch">
                    {result.epochId}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-muted-foreground mb-1">Policy</dt>
                  <dd data-testid="text-result-policy">
                    <Badge variant="secondary">{result.policy}</Badge>
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="w-6 h-6" />
                <span className="font-semibold text-lg">Invalid Attestation</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Signature verification failed or attestation is malformed
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
