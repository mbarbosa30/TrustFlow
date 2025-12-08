import { GlobalStats } from "@/components/GlobalStats";
import { RecentActivity } from "@/components/RecentActivity";
import { LocalHealthHistogram } from "@/components/LocalHealthHistogram";
import { LocalHealthGraph } from "@/components/graph/LocalHealthGraph";
import { ConvergenceChart } from "@/components/analytics/ConvergenceChart";
import { VouchTimelineChart } from "@/components/analytics/VouchTimelineChart";
import { FlowRedundancyScatter } from "@/components/analytics/FlowRedundancyScatter";
import { VoucherStrengthHistogram } from "@/components/analytics/VoucherStrengthHistogram";
import { FlowSaturationCurve } from "@/components/analytics/FlowSaturationCurve";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Users, Heart, Network, Activity, Shield, Zap, GitBranch, Gauge, TrendingUp, Target, Layers, BarChart3, AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Dashboard() {
  const { data: localHealthData, isLoading: isLoadingLocalHealth } = useQuery<{
    totalUsers: number;
    avgLocalHealth: number;
    distribution: { bin: string; count: number }[];
  }>({
    queryKey: ['/api/stats/local-health'],
  });

  const { data: statsData, isLoading: isLoadingStats } = useQuery<{
    totalUsers: number;
    totalEndorsements: number;
    totalEndorsers: number;
    totalEndorsees: number;
    trustedUsers: number;
    avgScore: number;
  }>({
    queryKey: ['/api/stats'],
  });

  const { data: recentEndorsementsData } = useQuery<{ endorsements: Array<{
    id: number;
    endorser: string;
    endorsee: string;
    createdAt: Date;
    leafHash: string;
  }> }>({
    queryKey: ['/api/endorsements?limit=10'],
  });

  const recentActivities = recentEndorsementsData?.endorsements.map(e => ({
    id: e.id.toString(),
    type: "endorsement" as const,
    endorser: `${e.endorser.slice(0, 6)}...${e.endorser.slice(-4)}`,
    endorsee: `${e.endorsee.slice(0, 6)}...${e.endorsee.slice(-4)}`,
    timestamp: new Date(e.createdAt).toISOString(),
  })) || [];

  const HEALTHY_VOUCH_COUNT = 8.0;
  const HEALTHY_REDUNDANCY = 35.0;
  const SCALING_EXPONENT = 2.0;
  const SCORE_CEILING = 99;

  const avgVouchers = statsData ? (statsData.totalEndorsements / Math.max(statsData.totalUsers, 1)) : 0;
  const flowRatio = Math.min(1.0, avgVouchers / HEALTHY_VOUCH_COUNT);
  const flowComponent = 60 * Math.pow(flowRatio, SCALING_EXPONENT);
  
  const estimatedRedundancy = avgVouchers * 1.5;
  const redundancyRatio = Math.min(1.0, estimatedRedundancy / HEALTHY_REDUNDANCY);
  const redundancyComponent = 40 * Math.pow(redundancyRatio, SCALING_EXPONENT);
  
  const expectedAvgLocalHealth = Math.min(SCORE_CEILING, flowComponent + redundancyComponent);

  return (
    <div className="w-full">
      {/* Hero Section - LocalHealth Network Graph */}
      <div className="w-full bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-[1800px] mx-auto px-4 py-6">
          {/* Header with Key Metrics */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Network className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold" data-testid="heading-dashboard">Trust Network</h1>
                <p className="text-muted-foreground">
                  LocalHealth signals computed from endorsement graph topology
                </p>
              </div>
            </div>
            
            {/* Key Metrics Strip */}
            <div className="flex flex-wrap items-center gap-3">
              {localHealthData && (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Users</span>
                    <span className="text-xl font-bold" data-testid="text-local-health-total-users">
                      {localHealthData.totalUsers}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Heart className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Avg LocalHealth</span>
                    <span className="text-xl font-bold text-primary" data-testid="text-avg-local-health">
                      {localHealthData.avgLocalHealth.toFixed(1)}
                    </span>
                  </div>
                </>
              )}
              
              {statsData && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Vouches</span>
                  <span className="text-xl font-bold" data-testid="text-total-endorsements">
                    {statsData.totalEndorsements}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Full-Width Graph - Hero Element */}
          <LocalHealthGraph limit={100} communityId={0} height="65vh" heroMode={true} />
        </div>
      </div>

      {/* Main Analytics Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-8">
          
          {/* Flow Analytics Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Flow Analytics</h2>
                <p className="text-sm text-muted-foreground">Max-flow/min-cut metrics powering LocalHealth computation</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Flow Saturation */}
              <Card data-testid="card-flow-saturation-metric">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-primary" />
                    Flow Saturation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2" data-testid="text-flow-saturation">
                    {(flowRatio * 100).toFixed(0)}%
                  </div>
                  <Progress value={flowRatio * 100} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Avg {avgVouchers.toFixed(1)} vouches / {HEALTHY_VOUCH_COUNT} healthy target
                  </p>
                </CardContent>
              </Card>

              {/* Vouch Density */}
              <Card data-testid="card-vouch-density">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-primary" />
                    Vouch Density
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2" data-testid="text-vouch-density">
                    {avgVouchers.toFixed(2)}
                  </div>
                  <Progress value={Math.min(avgVouchers / 10, 1) * 100} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Average vouches per user
                  </p>
                </CardContent>
              </Card>

              {/* Redundancy Score */}
              <Card data-testid="card-redundancy-score">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Redundancy Index
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2" data-testid="text-redundancy-index">
                    {(redundancyRatio * 100).toFixed(0)}%
                  </div>
                  <Progress value={redundancyRatio * 100} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Path redundancy (40% of score)
                  </p>
                </CardContent>
              </Card>

              {/* Network Coverage */}
              <Card data-testid="card-network-coverage">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Network Coverage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2" data-testid="text-network-coverage">
                    {statsData ? ((statsData.totalEndorsees / Math.max(statsData.totalUsers, 1)) * 100).toFixed(0) : 0}%
                  </div>
                  <Progress value={statsData ? (statsData.totalEndorsees / Math.max(statsData.totalUsers, 1)) * 100 : 0} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Users with at least one vouch
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Live Formula Display */}
          <Card className="bg-muted/30" data-testid="card-live-formula">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                LocalHealth Formula (Live Computation)
              </CardTitle>
              <CardDescription>
                Real-time calculation using current network averages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-background rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <div className="text-muted-foreground mb-2">// LocalHealth = 60 × (flowRatio)² + 40 × (redundancyRatio)² × vouchQuality</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-primary font-bold">LocalHealth</span>
                    <span>=</span>
                    <span className="px-2 py-1 bg-blue-500/10 rounded" data-testid="text-flow-component">{flowComponent.toFixed(1)}</span>
                    <span className="text-muted-foreground text-xs">(flow)</span>
                    <span>+</span>
                    <span className="px-2 py-1 bg-green-500/10 rounded" data-testid="text-redundancy-component">{redundancyComponent.toFixed(1)}</span>
                    <span className="text-muted-foreground text-xs">(redundancy)</span>
                    <span>=</span>
                    <span className="px-3 py-1 bg-primary text-primary-foreground rounded font-bold" data-testid="text-expected-local-health">
                      {expectedAvgLocalHealth.toFixed(1)}
                    </span>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="font-medium">Flow Component (60 pts max)</div>
                    <div className="text-muted-foreground">
                      60 × (vouches / {HEALTHY_VOUCH_COUNT})² = {flowComponent.toFixed(1)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium">Redundancy Component (40 pts max)</div>
                    <div className="text-muted-foreground">
                      40 × (redundancy / {HEALTHY_REDUNDANCY})² = {redundancyComponent.toFixed(1)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium">Iterative Convergence</div>
                    <div className="text-muted-foreground">
                      PageRank-style with voucher weighting
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LocalHealth Distribution & Algorithm Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {localHealthData && localHealthData.distribution.length > 0 && (
                <LocalHealthHistogram
                  distribution={localHealthData.distribution}
                  isLoading={isLoadingLocalHealth}
                />
              )}
            </div>
            
            <Card data-testid="card-local-health-algorithm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Algorithm Parameters
                </CardTitle>
                <CardDescription>
                  Recursive trust computation settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Flow Weight</span>
                    <Badge variant="outline">60 pts</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Redundancy Weight</span>
                    <Badge variant="outline">40 pts</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Scaling Exponent</span>
                    <Badge variant="outline">{SCALING_EXPONENT}</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Healthy Vouchers</span>
                    <Badge variant="secondary">{HEALTHY_VOUCH_COUNT}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Healthy Redundancy</span>
                    <Badge variant="secondary">{HEALTHY_REDUNDANCY}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Score Ceiling</span>
                    <Badge variant="secondary">99</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic pt-2">
                  Iterative PageRank-style computation where vouches are weighted by voucher strength.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Algorithm Analytics Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Algorithm Analytics</h2>
                <p className="text-sm text-muted-foreground">Convergence telemetry, flow dynamics, and vouch strength distributions</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <ConvergenceChart />
              <FlowSaturationCurve />
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <FlowRedundancyScatter />
              <VoucherStrengthHistogram />
            </div>
          </div>

          {/* Network Timeline */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Network Timeline</h2>
                <p className="text-sm text-muted-foreground">Vouch activity over real timestamps</p>
              </div>
            </div>
            
            <VouchTimelineChart />
          </div>

          {/* Network Health & Risk Section - Placeholder for new charts */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Network Health & Risks</h2>
                <p className="text-sm text-muted-foreground">Vulnerability detection and resilience analysis (coming soon)</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-dashed" data-testid="card-growth-cohort-placeholder">
                <CardHeader>
                  <CardTitle className="text-sm">Growth Cohort Analysis</CardTitle>
                  <CardDescription>New user quality over time</CardDescription>
                </CardHeader>
                <CardContent className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                  Coming soon
                </CardContent>
              </Card>
              
              <Card className="border-dashed" data-testid="card-edge-fragility-placeholder">
                <CardHeader>
                  <CardTitle className="text-sm">Edge Fragility Analyzer</CardTitle>
                  <CardDescription>Critical connection points</CardDescription>
                </CardHeader>
                <CardContent className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                  Coming soon
                </CardContent>
              </Card>
              
              <Card className="border-dashed" data-testid="card-sybil-radar-placeholder">
                <CardHeader>
                  <CardTitle className="text-sm">Sybil Risk Radar</CardTitle>
                  <CardDescription>Suspicious cluster detection</CardDescription>
                </CardHeader>
                <CardContent className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                  Coming soon
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Global Stats & Recent Activity */}
          <div className="grid md:grid-cols-2 gap-6">
            {isLoadingStats ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">Loading network statistics...</div>
                </CardContent>
              </Card>
            ) : statsData ? (
              <GlobalStats stats={{
                totalUsers: statsData.totalUsers,
                totalEndorsements: statsData.totalEndorsements,
                totalEndorsers: statsData.totalEndorsers,
                totalEndorsees: statsData.totalEndorsees,
                trustedUsers: statsData.trustedUsers,
                avgScore: statsData.avgScore,
              }} />
            ) : null}

            <RecentActivity activities={recentActivities} />
          </div>
        </div>
      </div>
    </div>
  );
}
