import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react";

export default function MyWallet() {
  const { address, isConnected } = useAccount();

  // Fetch user's trust score
  const { data: scoreData, isLoading: isLoadingScore } = useQuery<{
    score: {
      sts: number;
      tier: string;
      percentile: number;
      flow: number;
      minCut: number;
      stability: number;
      depth: number;
      pageRank: number;
      isAccepted: boolean;
    };
  }>({
    queryKey: [`/api/score/${address}`],
    enabled: Boolean(address),
  });


  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
              <p className="text-muted-foreground">
                Please connect your wallet to view your trust score
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Wallet</h1>
        <p className="text-muted-foreground">
          Your trust score and lending activity
        </p>
      </div>

      <div className="grid lg:grid-cols-1 gap-6 mb-6">
        {/* Trust Score Card */}
        <Card data-testid="card-trust-score">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trust Score
            </CardTitle>
            <CardDescription>
              Your Standardized Trust Score (STS) in the network
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingScore ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading trust score...
              </div>
            ) : scoreData?.score ? (
              <div className="space-y-4">
                <div className="flex items-baseline gap-4">
                  <div className="text-5xl font-bold font-mono" data-testid="text-sts-score">
                    {scoreData.score.sts.toFixed(2)}
                  </div>
                  <div>
                    <Badge variant={
                      scoreData.score.tier === "Trusted" ? "default" :
                      scoreData.score.tier === "Verified" ? "secondary" : 
                      "outline"
                    } data-testid="badge-tier">
                      {scoreData.score.tier || "Unranked"}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      Top {(100 - scoreData.score.percentile).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Flow (55%)</span>
                    <span className="font-mono">{scoreData.score.flow.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Min-Cut (25%)</span>
                    <span className="font-mono">{scoreData.score.minCut.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stability (5%)</span>
                    <span className="font-mono">{scoreData.score.stability.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Depth (10%)</span>
                    <span className="font-mono">{scoreData.score.depth.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">PageRank (5%)</span>
                    <span className="font-mono">{scoreData.score.pageRank.toFixed(2)}</span>
                  </div>
                </div>

                {!scoreData.score.isAccepted && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      You need to build more trust connections to qualify for economic benefits.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No trust score available. Build connections to get scored!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
