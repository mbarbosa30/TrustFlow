import { GlobalStats } from "@/components/GlobalStats";
import { RecentActivity } from "@/components/RecentActivity";
import { GHIGauge } from "@/components/GHIGauge";
import { LocalHealthHistogram } from "@/components/LocalHealthHistogram";
import { NetworkGrowthChart } from "@/components/NetworkGrowthChart";
import { EndorsementVelocityChart } from "@/components/EndorsementVelocityChart";
import { ScoreComponentsChart } from "@/components/ScoreComponentsChart";
import { NetworkDensityChart } from "@/components/NetworkDensityChart";
import { PathDiversityChart } from "@/components/PathDiversityChart";
import { NetworkSecurityHealth } from "@/components/NetworkSecurityHealth";
import { PageRankMetrics } from "@/components/PageRankMetrics";
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
import { Users, Heart, Network, Activity, Shield, Zap, GitBranch, Gauge, TrendingUp, Target, Layers, BarChart3 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Dashboard() {
  const { data: epochData } = useQuery<{ epochId: number }>({
    queryKey: ['/api/epoch/current'],
  });

  const currentEpochId = epochData?.epochId ?? 0;

  const { data: localHealthData, isLoading: isLoadingLocalHealth } = useQuery<{
    totalUsers: number;
    avgLocalHealth: number;
    distribution: { bin: string; count: number }[];
  }>({
    queryKey: ['/api/stats/local-health'],
  });

  const { data: healthData, isLoading: isLoadingHealth } = useQuery<{
    epoch: number;
    GHI: number;
    metrics: {
      sizeN: number;
      cutN: number;
      churnN: number;
    };
    raw: {
      acceptedCount: number;
      avgMinCut: number;
      churnStability: number;
    };
  }>({
    queryKey: [`/api/epoch/${currentEpochId}/health`],
    enabled: currentEpochId !== undefined,
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

  const { data: networkGrowthData, isLoading: isLoadingNetworkGrowth } = useQuery<{
    data: Array<{ epoch: string; totalUsers: number; activeUsers: number }>;
  }>({
    queryKey: ['/api/analytics/network-growth'],
  });

  const { data: endorsementVelocityData, isLoading: isLoadingEndorsementVelocity } = useQuery<{
    data: Array<{ epoch: string; newEndorsements: number; revokedEndorsements: number }>;
  }>({
    queryKey: ['/api/analytics/endorsement-velocity'],
  });

  const { data: scoreComponentsData, isLoading: isLoadingScoreComponents } = useQuery<{
    data: Array<{ epoch: string; flow: number; cut: number; stability: number; depth: number; pageRank: number }>;
  }>({
    queryKey: ['/api/analytics/score-components'],
  });

  const { data: pageRankMetricsData, isLoading: isLoadingPageRankMetrics } = useQuery<{
    prSkew: number;
    seedConcentration: number;
    maxScore: number;
    p95Score: number;
    iterations: number;
    converged: boolean;
  } | null>({
    queryKey: [`/api/epoch/${currentEpochId}/pagerank-metrics`],
    enabled: currentEpochId !== undefined,
  });

  const { data: networkDensityData, isLoading: isLoadingNetworkDensity } = useQuery<{
    data: Array<{ epoch: string; endorsementsPerUser: number; avgPathLength: number }>;
  }>({
    queryKey: ['/api/analytics/network-density'],
  });

  const { data: pathDiversityData, isLoading: isLoadingPathDiversity } = useQuery<{
    min: number;
    p25: number;
    median: number;
    p75: number;
    max: number;
    count: number;
  }>({
    queryKey: ['/api/analytics/path-diversity'],
  });

  const { data: securityHealthData, isLoading: isLoadingSecurityHealth } = useQuery<{
    seedSaturation: {
      maxShare: number;
      maxSeedAddress: string | null;
      status: 'healthy' | 'caution' | 'warning';
    } | null;
    pathDiversity: {
      average: number;
      status: 'healthy' | 'moderate' | 'low';
    };
    avgMinCut: {
      value: number;
      status: 'strong' | 'adequate' | 'weak';
    };
    acceptedUsers: number;
    epochId: number;
  }>({
    queryKey: ['/api/analytics/security-health'],
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
  
  const avgMinCut = healthData?.raw?.avgMinCut ?? 0;
  const estimatedRedundancy = avgVouchers + (avgMinCut * 2);
  const redundancyRatio = Math.min(1.0, estimatedRedundancy / HEALTHY_REDUNDANCY);
  const redundancyComponent = 40 * Math.pow(redundancyRatio, SCALING_EXPONENT);
  
  const expectedAvgLocalHealth = Math.min(SCORE_CEILING, flowComponent + redundancyComponent);

  return (
    <div className="w-full">
      {/* Hero Section - LocalHealth Network Graph */}
      <div className="w-full bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-[1800px] mx-auto px-4 py-6">
          {/* Header with Epoch and Key Metrics */}
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
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border">
                <span className="text-sm text-muted-foreground">Epoch</span>
                <span className="text-xl font-bold font-mono" data-testid="text-dashboard-epoch">
                  {currentEpochId}
                </span>
              </div>
              
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
                  <span className="text-sm text-muted-foreground">Endorsements</span>
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
          
          {/* Flow Analytics Section - NEW */}
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
              <Card data-testid="card-flow-saturation">
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

              {/* Min-Cut Quality */}
              <Card data-testid="card-mincut-quality">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-primary" />
                    Min-Cut Quality
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2" data-testid="text-mincut-quality">
                    {avgMinCut.toFixed(1)}
                  </div>
                  <Progress value={Math.min(avgMinCut / 3, 1) * 100} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Independent paths to seeds (target: 3.0)
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
                    {(redundancyComponent * 100).toFixed(0)}%
                  </div>
                  <Progress value={redundancyComponent * 100} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Path redundancy contributing 40% to score
                  </p>
                </CardContent>
              </Card>

              {/* Churn Stability */}
              <Card data-testid="card-churn-stability">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Network Stability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2" data-testid="text-network-stability">
                    {healthData ? (healthData.raw.churnStability * 100).toFixed(0) : 0}%
                  </div>
                  <Progress value={healthData ? healthData.raw.churnStability * 100 : 0} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    User retention between epochs
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
                      60 × (vouches / {HEALTHY_VOUCH_COUNT})² = 60 × ({avgVouchers.toFixed(1)} / {HEALTHY_VOUCH_COUNT})² = {flowComponent.toFixed(1)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium">Redundancy Component (40 pts max)</div>
                    <div className="text-muted-foreground">
                      40 × (redundancy / {HEALTHY_REDUNDANCY})² = 40 × ({estimatedRedundancy.toFixed(1)} / {HEALTHY_REDUNDANCY})² = {redundancyComponent.toFixed(1)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium">Iterative Convergence</div>
                    <div className="text-muted-foreground">
                      Vouches weighted by voucher LocalHealth, converging in ~{pageRankMetricsData?.iterations || 7} iterations (PageRank-style)
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* GHI and Network Health - Promoted from collapsed */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* GHI Gauge */}
            <Card data-testid="card-ghi-main">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="w-5 h-5" />
                  Global Health Index
                </CardTitle>
                <CardDescription>
                  Overall network quality signal
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                {isLoadingHealth ? (
                  <div className="text-muted-foreground py-8">Loading...</div>
                ) : healthData ? (
                  <>
                    <GHIGauge ghi={healthData.GHI} size="lg" />
                    <div className="grid grid-cols-3 gap-4 w-full mt-4 text-center">
                      <div>
                        <div className="text-lg font-bold">{healthData.metrics.sizeN}</div>
                        <div className="text-xs text-muted-foreground">Size</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">{healthData.metrics.cutN}</div>
                        <div className="text-xs text-muted-foreground">Cut</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">{healthData.metrics.churnN}</div>
                        <div className="text-xs text-muted-foreground">Churn</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground py-8">No data</div>
                )}
              </CardContent>
            </Card>

            {/* Network Security Health */}
            <NetworkSecurityHealth 
              data={securityHealthData || null}
              isLoading={isLoadingSecurityHealth}
            />

            {/* PageRank Convergence */}
            <PageRankMetrics 
              data={pageRankMetricsData || null}
              isLoading={isLoadingPageRankMetrics}
            />
          </div>

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

          {/* Advanced Algorithm Analytics */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Algorithm Analytics</h2>
                <p className="text-sm text-muted-foreground">Convergence telemetry, flow dynamics, and vouch strength distributions for mathematicians</p>
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

          {/* Temporal Analytics - Timestamp Based */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Network Timeline</h2>
                <p className="text-sm text-muted-foreground">Vouch activity over real timestamps (not epochs)</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <VouchTimelineChart />
              <PathDiversityChart 
                data={pathDiversityData} 
                isLoading={isLoadingPathDiversity}
              />
            </div>
          </div>
          
          {/* Score Components Over Time */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Layers className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Component Breakdown</h2>
                <p className="text-sm text-muted-foreground">Score components and network evolution across epochs</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <ScoreComponentsChart 
                data={scoreComponentsData?.data || []} 
                isLoading={isLoadingScoreComponents}
              />
            </div>
          </div>

          {/* Network Growth & Density */}
          <div className="grid md:grid-cols-2 gap-6">
            <NetworkGrowthChart 
              data={networkGrowthData?.data || []} 
              isLoading={isLoadingNetworkGrowth}
            />
            <EndorsementVelocityChart 
              data={endorsementVelocityData?.data || []} 
              isLoading={isLoadingEndorsementVelocity}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <NetworkDensityChart 
              data={networkDensityData?.data || []} 
              isLoading={isLoadingNetworkDensity}
            />
            
            {/* Global Stats Summary */}
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
          </div>

          <Separator className="my-4" />

          {/* Recent Activity */}
          <RecentActivity activities={recentActivities} />
        </div>
      </div>
    </div>
  );
}
