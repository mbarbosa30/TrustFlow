import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Search, Users, Award, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface BlueskyAnalysisResult {
  identifier: string;
  did: string;
  stats: {
    follows: number;
    followers: number;
    totalUsers: number;
    acceptedUsers: number;
    avgSTS: number;
  };
  networkMetrics: {
    totalAccepted: number;
    avgFlow: number;
    avgMinCut: number;
    p95Flow: number;
  };
  scores: Array<{
    address: string;
    sts: number;
    tier: string | null;
    flow: number;
    minCut: number;
    depth: number;
  }>;
}

export default function BlueskyExplorer() {
  const [identifier, setIdentifier] = useState("");
  const [result, setResult] = useState<BlueskyAnalysisResult | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', '/api/bluesky/analyze', { identifier: id });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setResult(data);
    },
  });

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (identifier.trim()) {
      analyzeMutation.mutate(identifier.trim());
    }
  };

  const getTierColor = (tier: string | null) => {
    switch (tier) {
      case "Master": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "Journeyer": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Apprentice": return "bg-green-500/10 text-green-500 border-green-500/20";
      default: return "bg-muted/10 text-muted-foreground border-border";
    }
  };

  const tierCounts = result?.scores.reduce((acc, s) => {
    const tier = s.tier || "Not Accepted";
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold" data-testid="text-title">
            Bluesky Trust Explorer
          </h1>
          <p className="text-lg text-muted-foreground" data-testid="text-description">
            Analyze Bluesky social graphs using TrustFlow's max-flow scoring algorithm
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Analyze a Bluesky Account</CardTitle>
            <CardDescription>
              Enter a Bluesky handle (e.g., alice.bsky.social) or DID to analyze their network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAnalyze} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Bluesky Handle or DID</Label>
                <div className="flex gap-2">
                  <Input
                    id="identifier"
                    data-testid="input-bluesky-identifier"
                    placeholder="alice.bsky.social or did:plc:..."
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={analyzeMutation.isPending}
                  />
                  <Button 
                    type="submit" 
                    data-testid="button-analyze"
                    disabled={analyzeMutation.isPending || !identifier.trim()}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {analyzeMutation.isPending ? "Analyzing..." : "Analyze"}
                  </Button>
                </div>
              </div>

              {analyzeMutation.isError && (
                <Alert variant="destructive" data-testid="alert-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {(analyzeMutation.error as any)?.message || "Failed to analyze Bluesky network"}
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Network Overview</CardTitle>
                <CardDescription className="font-mono text-xs">
                  {result.identifier} ({result.did})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-1" data-testid="card-metric-follows">
                    <div className="text-sm text-muted-foreground">Follows</div>
                    <div className="text-2xl font-bold">{result.stats.follows}</div>
                  </div>
                  <div className="space-y-1" data-testid="card-metric-followers">
                    <div className="text-sm text-muted-foreground">Followers</div>
                    <div className="text-2xl font-bold">{result.stats.followers}</div>
                  </div>
                  <div className="space-y-1" data-testid="card-metric-total-users">
                    <div className="text-sm text-muted-foreground">Total Users</div>
                    <div className="text-2xl font-bold">{result.stats.totalUsers}</div>
                  </div>
                  <div className="space-y-1" data-testid="card-metric-accepted">
                    <div className="text-sm text-muted-foreground">Accepted</div>
                    <div className="text-2xl font-bold text-green-500">{result.stats.acceptedUsers}</div>
                  </div>
                  <div className="space-y-1" data-testid="card-metric-avg-sts">
                    <div className="text-sm text-muted-foreground">Avg STS</div>
                    <div className="text-2xl font-bold">{result.stats.avgSTS}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Network Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center" data-testid="text-avg-flow">
                    <span className="text-sm text-muted-foreground">Average Flow</span>
                    <span className="font-semibold">{result.networkMetrics.avgFlow.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center" data-testid="text-avg-mincut">
                    <span className="text-sm text-muted-foreground">Average Min-Cut</span>
                    <span className="font-semibold">{result.networkMetrics.avgMinCut.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center" data-testid="text-p95-flow">
                    <span className="text-sm text-muted-foreground">P95 Flow</span>
                    <span className="font-semibold">{result.networkMetrics.p95Flow.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Tier Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tierCounts && Object.entries(tierCounts)
                    .sort(([a], [b]) => {
                      const order = ["Master", "Journeyer", "Apprentice", "Not Accepted"];
                      return order.indexOf(a) - order.indexOf(b);
                    })
                    .map(([tier, count]) => (
                      <div key={tier} className="flex justify-between items-center" data-testid={`tier-${tier.toLowerCase().replace(/\s+/g, '-')}`}>
                        <Badge variant="outline" className={getTierColor(tier === "Not Accepted" ? null : tier)}>
                          {tier}
                        </Badge>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Top Scores (Top 50)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Rank</th>
                        <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">DID</th>
                        <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">STS</th>
                        <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Tier</th>
                        <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Flow</th>
                        <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Min-Cut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.scores.slice(0, 20).map((score, idx) => (
                        <tr key={score.address} className="border-b hover-elevate" data-testid={`row-score-${idx}`}>
                          <td className="py-2 px-2 text-sm">{idx + 1}</td>
                          <td className="py-2 px-2 text-sm font-mono text-xs">
                            {score.address.substring(0, 20)}...
                          </td>
                          <td className="py-2 px-2 text-sm font-semibold">{score.sts}</td>
                          <td className="py-2 px-2 text-sm">
                            <Badge variant="outline" className={getTierColor(score.tier)}>
                              {score.tier || "None"}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-sm">{score.flow}</td>
                          <td className="py-2 px-2 text-sm">{score.minCut}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Alert data-testid="alert-info">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This analysis runs TrustFlow's Sybil-resistant scoring algorithm on Bluesky's social graph.
                It treats the selected user as the seed and analyzes their follow/follower network.
                Results are computed in real-time and not stored.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
}
