import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Settings, Globe, Lock } from "lucide-react";

export default function CommunityDetail() {
  const params = useParams();
  const communityId = params.id;

  const { data, isLoading } = useQuery<{ community: any }>({
    queryKey: ["/api/communities", communityId],
    enabled: !!communityId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-8 bg-accent rounded w-1/2 mb-2" />
            <div className="h-4 bg-accent rounded w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 bg-accent rounded w-full" />
              <div className="h-4 bg-accent rounded w-2/3" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const community = data?.community;

  if (!community) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Community not found</h3>
            <Link href="/communities">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Communities
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const policy = community.policy;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link href="/communities">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Communities
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        <Card data-testid="card-community-header">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-3xl">{community.name}</CardTitle>
                  {community.visibility === "public" ? (
                    <Globe className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <CardDescription className="text-base">{community.description}</CardDescription>
              </div>
              <Badge variant="secondary" className="text-sm">
                Community {community.id}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Endorsement Prompt</h3>
              <p className="text-lg font-medium">"{community.promptText}"</p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t">
              <Badge variant="outline">{community.policyId}</Badge>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">
                Prompt Hash: {community.promptHash.slice(0, 10)}...{community.promptHash.slice(-8)}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card data-testid="card-acceptance-criteria">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Acceptance Criteria
              </CardTitle>
              <CardDescription>Sybil-resistance requirements for trust</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-accent">
                  <div className="text-xs text-muted-foreground mb-1">Min Cut</div>
                  <div className="text-2xl font-semibold">{policy.acceptance.minCut}</div>
                </div>
                <div className="p-3 rounded-lg bg-accent">
                  <div className="text-xs text-muted-foreground mb-1">Vertex Disjoint</div>
                  <div className="text-2xl font-semibold">{policy.acceptance.vertexDisjoint}</div>
                </div>
                <div className="p-3 rounded-lg bg-accent">
                  <div className="text-xs text-muted-foreground mb-1">Min Seeds</div>
                  <div className="text-2xl font-semibold">{policy.acceptance.seedCoverage.minSeeds}</div>
                </div>
                <div className="p-3 rounded-lg bg-accent">
                  <div className="text-xs text-muted-foreground mb-1">Min Seed Score</div>
                  <div className="text-2xl font-semibold">
                    {(policy.acceptance.seedCoverage.minSeedScore * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-accent col-span-2">
                  <div className="text-xs text-muted-foreground mb-1">Per-Seed Share</div>
                  <div className="text-2xl font-semibold">
                    ≥{(policy.acceptance.seedCoverage.minPerSeedShare * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-trust-tiers">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Trust Tiers
              </CardTitle>
              <CardDescription>Badge levels for trusted members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {policy.tiers.map((tier: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-sm">
                    {tier}
                  </Badge>
                ))}
              </div>

              <div className="pt-3 border-t">
                <h4 className="text-sm font-semibold mb-3">Capacity by Distance</h4>
                <div className="flex gap-2">
                  {policy.nodeCap.distance.map((cap: number, idx: number) => (
                    <div key={idx} className="flex-1 p-2 rounded-lg bg-accent text-center">
                      <div className="text-xs text-muted-foreground">d={idx}</div>
                      <div className="text-lg font-semibold">{cap}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">How to Join</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>To earn trust in this community:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Get endorsed by existing trusted members</li>
              <li>Meet the acceptance criteria (min-cut ≥{policy.acceptance.minCut}, vertex-disjoint ≥{policy.acceptance.vertexDisjoint})</li>
              <li>Maintain connections to at least {policy.acceptance.seedCoverage.minSeeds} quality seeds</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
