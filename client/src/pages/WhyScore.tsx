import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount } from 'wagmi';

export default function WhyScore() {
  const { isConnected } = useAccount();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Why This Score?</h1>
        <p className="text-muted-foreground">
          Detailed score breakdowns and explainability are computed during epoch runs
        </p>
      </div>

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
  );
}
