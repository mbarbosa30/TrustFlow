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
                  <li>Aligned with tier badges (Apprentice, Journeyer, Master)</li>
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
      </div>
    </div>
  );
}
