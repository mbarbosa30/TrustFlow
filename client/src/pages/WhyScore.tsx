import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from '@/hooks/useWallet';

export default function WhyScore() {
  const { isConnected } = useWallet();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Why This Score?</h1>
        <p className="text-muted-foreground">
          Detailed score breakdowns and explainability are computed during epoch runs
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Understanding Flow vs. STS</CardTitle>
            <CardDescription>
              Two ways to view your trust: raw algorithm output and standardized score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Raw Flow (Honest Algorithm Output)</h3>
                <p className="text-sm text-muted-foreground">
                  The <strong>flow value</strong> is the actual max-flow capacity from seed nodes to you, 
                  measured in capacity units. This is what the Ford-Fulkerson max-flow algorithm computes 
                  directly, representing the total "trust capacity" that can reach you through independent 
                  paths.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside mt-2">
                  <li>Unbounded value (can be any positive number)</li>
                  <li>Direct algorithm output (no post-processing)</li>
                  <li>Grows as network size and connectivity increase</li>
                  <li>Comparable across epochs with similar network structure</li>
                </ul>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Standardized Trust Score (STS)</h3>
                <p className="text-sm text-muted-foreground">
                  The <strong>STS</strong> normalizes flow to a 0-100 scale for easier interpretation and 
                  comparison. It's calculated using percentile ranking within the current epoch's distribution.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside mt-2">
                  <li>Always between 0 and 100</li>
                  <li>Relative to other users in the current epoch</li>
                  <li>Easier for humans to interpret</li>
                  <li>Aligned with tier badges (Connected, Verified, Trusted)</li>
                </ul>
              </div>

              <div className="pt-4 border-t bg-muted rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-sm">Why Show Both?</h3>
                <p className="text-xs text-muted-foreground">
                  Flow is the "honest" algorithm output, showing absolute trust strength. STS makes scores 
                  human-readable and comparable. Together, they provide transparency: you see both the raw 
                  computation and the user-friendly interpretation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score Explainability</CardTitle>
            <CardDescription>
              Trust scores and their breakdowns are calculated during epoch computations
            </CardDescription>
          </CardHeader>
          <CardContent className="py-8">
            {!isConnected ? (
              <p className="text-sm text-muted-foreground text-center">
                Connect your wallet to view your trust score breakdown
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Your score breakdown will appear here after:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                  <li>You receive vouches from users in the network</li>
                  <li>An epoch computation runs to calculate max-flow paths</li>
                  <li>Your STS (Standardized Trust Score) components are computed</li>
                </ul>
                <p className="text-sm text-muted-foreground pt-4">
                  The score breakdown will show:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                  <li><strong>Flow (F):</strong> Max-flow reaching you from seeds</li>
                  <li><strong>Cut (C):</strong> Min-cut size (path redundancy)</li>
                  <li><strong>Stability (S):</strong> Resistance to edge removal</li>
                  <li><strong>Depth (D):</strong> Proximity to trust roots</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seed Quality & Network Health</CardTitle>
            <CardDescription>
              Seeds are not static - they're continuously scored on their influence quality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                In vulnerable communities lacking identity systems and access to finance, collusion risk is high. To prevent 
                a few compromised seeds from polluting the entire network, <strong>seeds themselves are scored</strong> on multiple metrics:
              </p>

              <div className="grid gap-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <h4 className="font-semibold text-sm mb-1">Predictive Validity</h4>
                  <p className="text-xs text-muted-foreground">
                    Do users vouched by this seed stay accepted even if the seed is removed? High scores mean resilient, 
                    well-connected communities.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <h4 className="font-semibold text-sm mb-1">Downstream Quality</h4>
                  <p className="text-xs text-muted-foreground">
                    What's the average trust score of users primarily influenced by this seed? Quality seeds build quality networks.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <h4 className="font-semibold text-sm mb-1">Diversity Lift</h4>
                  <p className="text-xs text-muted-foreground">
                    How many distinct communities does this seed reach? Diverse reach prevents capture by single groups.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <h4 className="font-semibold text-sm mb-1">Centralization Check</h4>
                  <p className="text-xs text-muted-foreground">
                    Seeds that dominate too much of the total flow get penalized to prevent over-reliance on any single source.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t">
                <h4 className="font-semibold text-sm mb-2">How Seed Scores Work</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Each seed gets a score from 0-1. This score:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Multiplies the seed's capacity (0.7x to 1.3x) - better seeds can vouch for more users</li>
                  <li>Determines if it counts toward the "≥2 seeds" acceptance requirement (needs score ≥0.6)</li>
                  <li>Creates a feedback loop: good seeds strengthen the network, weak seeds self-throttle</li>
                </ul>
              </div>

              <div className="pt-3 border-t bg-primary/10 rounded-lg p-3">
                <h4 className="font-semibold text-sm mb-1">Why This Matters for Vulnerable Communities</h4>
                <p className="text-xs text-muted-foreground">
                  Without seed scoring, compromising 1-2 seeds could pollute the entire graph. With it, attackers need to 
                  compromise <strong>multiple high-quality seeds across different communities</strong> - dramatically harder.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
