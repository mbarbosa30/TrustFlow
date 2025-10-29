import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, Users, Settings, Globe, Lock, Activity, 
  TrendingUp, Network, Shield, DollarSign, CheckCircle 
} from "lucide-react";

export default function CommunityDetail() {
  const params = useParams();
  const communityId = Number(params.id) || 0;

  const { data: communityData, isLoading: communityLoading } = useQuery<{ community: any }>({
    queryKey: ["/api/communities", communityId],
  });

  const { data: statusData } = useQuery<any>({
    queryKey: ["/api/status"],
  });

  const { data: endorsementsData } = useQuery<{ endorsements: any[] }>({
    queryKey: ["/api/endorsements"],
  });

  const { data: scoresData } = useQuery<{ scores: any[] }>({
    queryKey: ["/api/scores"],
  });

  if (communityLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
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

  const community = communityData?.community;

  if (!community) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
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
  
  const communityEndorsements = endorsementsData?.endorsements?.filter(
    (e: any) => e.communityId === communityId
  ) || [];
  
  const communityScores = scoresData?.scores?.filter(
    (s: any) => s.communityId === communityId
  ) || [];

  const acceptedMembers = communityScores.filter((s: any) => s.isAccepted);
  const networkSize = acceptedMembers.length;
  const totalEndorsements = communityEndorsements.length;
  
  const tierDistribution = acceptedMembers.reduce((acc: any, s: any) => {
    acc[s.tier] = (acc[s.tier] || 0) + 1;
    return acc;
  }, {});

  const avgMinCut = acceptedMembers.length > 0
    ? acceptedMembers.reduce((sum: number, s: any) => sum + (s.minCut || 0), 0) / acceptedMembers.length
    : 0;

  const avgFlow = acceptedMembers.length > 0
    ? acceptedMembers.reduce((sum: number, s: any) => sum + (s.flow || 0), 0) / acceptedMembers.length
    : 0;

  const uniqueMembers = new Set([
    ...communityEndorsements.map((e: any) => e.endorser),
    ...communityEndorsements.map((e: any) => e.endorsee),
  ]);

  const healthMetrics = statusData?.communityHealth?.[communityId] || statusData?.health;
  const ghi = healthMetrics?.ghi || 0;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
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
                  <CardTitle className="text-4xl">{community.name}</CardTitle>
                  {community.visibility === "public" ? (
                    <Globe className="w-6 h-6 text-muted-foreground" />
                  ) : (
                    <Lock className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <CardDescription className="text-lg mt-2">{community.description}</CardDescription>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="text-sm mb-2">
                  Community {community.id}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  {community.policyId}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-accent/50">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Endorsement Prompt</h3>
              <p className="text-xl font-medium">"{community.promptText}"</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-4">
          <Card data-testid="card-stat-members">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Network Size</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{networkSize}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Accepted members
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-endorsements">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Endorsements</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalEndorsements}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total vouches
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-health">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Health Score</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{ghi}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Graph Health Index
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-avgcut">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Min-Cut</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{avgMinCut.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Sybil resistance
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="policy">Policy</TabsTrigger>
            <TabsTrigger value="economy">Economy</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Trust Distribution</CardTitle>
                  <CardDescription>Members by trust tier</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {policy.tiers.map((tier: string, idx: number) => {
                    const count = tierDistribution[tier] || 0;
                    const percentage = networkSize > 0 ? (count / networkSize) * 100 : 0;
                    return (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary">{tier}</Badge>
                          <span className="text-sm font-medium">{count} members</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Network Metrics</CardTitle>
                  <CardDescription>Latest computation statistics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Flow</span>
                    <span className="text-lg font-semibold">{avgFlow.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Min-Cut</span>
                    <span className="text-lg font-semibold">{avgMinCut.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Participants</span>
                    <span className="text-lg font-semibold">{uniqueMembers.size}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Graph Health</span>
                    <span className="text-lg font-semibold">{ghi}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>About This Community</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="leading-relaxed">{community.description}</p>
                <div className="pt-3 border-t space-y-2">
                  <h4 className="font-semibold">Endorsement Criteria</h4>
                  <p className="text-muted-foreground">
                    Members endorse each other by affirming: <span className="font-medium">"{community.promptText}"</span>
                  </p>
                  <p className="text-muted-foreground">
                    All endorsements are cryptographically verified against the prompt hash to ensure consistency.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  Network Activity
                </CardTitle>
                <CardDescription>Recent endorsements and member activity</CardDescription>
              </CardHeader>
              <CardContent>
                {communityEndorsements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No endorsements yet. Be the first to vouch for someone!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {communityEndorsements.slice(0, 10).map((endorsement: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="text-sm font-medium font-mono">
                              {endorsement.endorser.slice(0, 6)}...{endorsement.endorser.slice(-4)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              endorsed {endorsement.endorsee.slice(0, 6)}...{endorsement.endorsee.slice(-4)}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Epoch {endorsement.epoch}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policy" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Acceptance Criteria
                  </CardTitle>
                  <CardDescription>Sybil-resistance requirements</CardDescription>
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
                      <div className="text-xs text-muted-foreground mb-1">Seed Quality</div>
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

              <Card>
                <CardHeader>
                  <CardTitle>Trust Tiers & Capacity</CardTitle>
                  <CardDescription>Badge levels and flow limits</CardDescription>
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
                <CardTitle className="text-base">How to Join This Community</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">To earn trust in {community.name}:</p>
                <ol className="list-decimal list-inside space-y-1.5 ml-2">
                  <li>Get endorsed by existing trusted members who can affirm: "{community.promptText}"</li>
                  <li>Build redundant paths through the network (min-cut ≥{policy.acceptance.minCut})</li>
                  <li>Ensure you have vertex-disjoint connections (≥{policy.acceptance.vertexDisjoint} independent paths)</li>
                  <li>Maintain quality connections to at least {policy.acceptance.seedCoverage.minSeeds} seed members</li>
                  <li>Each seed must provide ≥{(policy.acceptance.seedCoverage.minPerSeedShare * 100).toFixed(0)}% of your flow</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="economy" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Economic Development
                </CardTitle>
                <CardDescription>Transaction data and financial activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Economic metrics including transaction volumes, USDC transfers, and weighted PageRank based on financial activity will be available in Phase 2.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-accent/50">
              <CardHeader>
                <CardTitle className="text-base">Planned Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Transaction-weighted PageRank for economic influence scoring</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>USDC transfer volume tracking and analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>EigenTrust algorithm for reputation-based ranking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Community economic health metrics and trends</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
