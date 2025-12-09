import { GlobalStats } from "@/components/GlobalStats";
import { LocalHealthHistogram } from "@/components/LocalHealthHistogram";
import { LocalHealthGraph } from "@/components/graph/LocalHealthGraph";
import { ConvergenceChart } from "@/components/analytics/ConvergenceChart";
import { VouchTimelineChart } from "@/components/analytics/VouchTimelineChart";
import { FlowRedundancyScatter } from "@/components/analytics/FlowRedundancyScatter";
import { VoucherStrengthHistogram } from "@/components/analytics/VoucherStrengthHistogram";
import { FlowSaturationCurve } from "@/components/analytics/FlowSaturationCurve";
import { GrowthCohortChart } from "@/components/analytics/GrowthCohortChart";
import { VoucherInfluenceChart } from "@/components/analytics/VoucherInfluenceChart";
import { RedundancyDepthChart } from "@/components/analytics/RedundancyDepthChart";
import { EdgeFragilityChart } from "@/components/analytics/EdgeFragilityChart";
import { DilutionPressureChart } from "@/components/analytics/DilutionPressureChart";
import { SybilRiskChart } from "@/components/analytics/SybilRiskChart";
import { ConvergenceSensitivityChart } from "@/components/analytics/ConvergenceSensitivityChart";
import { DilutionZonesChart } from "@/components/analytics/DilutionZonesChart";
import { NetworkResilienceChart } from "@/components/analytics/NetworkResilienceChart";
import { AdaptiveBaselineMonitor } from "@/components/analytics/AdaptiveBaselineMonitor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Users, Heart, Network, Activity, Shield, Zap, GitBranch, Gauge, TrendingUp, Target, Layers, BarChart3, AlertTriangle, Crown, Scale } from "lucide-react";
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
        <div className="max-w-[1800px] mx-auto px-6 py-8">
          {/* Header with Key Metrics */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
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
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="space-y-16">
          
          {/* Flow Analytics Section */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <Zap className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Flow Analytics</h2>
                <p className="text-sm text-muted-foreground">Max-flow/min-cut metrics powering LocalHealth computation</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Flow Saturation */}
              <Card data-testid="card-flow-saturation-metric">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-primary" />
                    Flow Saturation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-3" data-testid="text-flow-saturation">
                    {(flowRatio * 100).toFixed(0)}%
                  </div>
                  <Progress value={flowRatio * 100} className="h-2 mb-3" />
                  <p className="text-xs text-muted-foreground">
                    Avg {avgVouchers.toFixed(1)} vouches / {HEALTHY_VOUCH_COUNT} target
                  </p>
                </CardContent>
              </Card>

              {/* Vouch Density */}
              <Card data-testid="card-vouch-density">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-primary" />
                    Vouch Density
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-3" data-testid="text-vouch-density">
                    {avgVouchers.toFixed(2)}
                  </div>
                  <Progress value={Math.min(avgVouchers / 10, 1) * 100} className="h-2 mb-3" />
                  <p className="text-xs text-muted-foreground">
                    Average vouches per user
                  </p>
                </CardContent>
              </Card>

              {/* Redundancy Score */}
              <Card data-testid="card-redundancy-score">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Redundancy Index
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-3" data-testid="text-redundancy-index">
                    {(redundancyRatio * 100).toFixed(0)}%
                  </div>
                  <Progress value={redundancyRatio * 100} className="h-2 mb-3" />
                  <p className="text-xs text-muted-foreground">
                    Path redundancy (40% of score)
                  </p>
                </CardContent>
              </Card>

              {/* Network Coverage */}
              <Card data-testid="card-network-coverage">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Network Coverage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-3" data-testid="text-network-coverage">
                    {statsData ? ((statsData.totalEndorsees / Math.max(statsData.totalUsers, 1)) * 100).toFixed(0) : 0}%
                  </div>
                  <Progress value={statsData ? (statsData.totalEndorsees / Math.max(statsData.totalUsers, 1)) * 100 : 0} className="h-2 mb-3" />
                  <p className="text-xs text-muted-foreground">
                    Users with at least one vouch
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Live Formula Display */}
          <section>
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
                <div className="space-y-6">
                  <div className="bg-background rounded-lg p-6 font-mono text-sm overflow-x-auto">
                    <div className="text-muted-foreground mb-3">// LocalHealth = 60 × (flowRatio)² + 40 × (redundancyRatio)² × vouchQuality</div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-primary font-bold text-lg">LocalHealth</span>
                      <span>=</span>
                      <span className="px-3 py-2 bg-blue-500/10 rounded text-base" data-testid="text-flow-component">{flowComponent.toFixed(1)}</span>
                      <span className="text-muted-foreground text-xs">(flow)</span>
                      <span>+</span>
                      <span className="px-3 py-2 bg-accent/30 rounded text-base" data-testid="text-redundancy-component">{redundancyComponent.toFixed(1)}</span>
                      <span className="text-muted-foreground text-xs">(redundancy)</span>
                      <span>=</span>
                      <span className="px-4 py-2 bg-primary text-primary-foreground rounded font-bold text-lg" data-testid="text-expected-local-health">
                        {expectedAvgLocalHealth.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-6 text-sm">
                    <div className="space-y-2">
                      <div className="font-medium">Flow Component (60 pts max)</div>
                      <div className="text-muted-foreground">
                        60 × (vouches / {HEALTHY_VOUCH_COUNT})² = {flowComponent.toFixed(1)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-medium">Redundancy Component (40 pts max)</div>
                      <div className="text-muted-foreground">
                        40 × (redundancy / {HEALTHY_REDUNDANCY})² = {redundancyComponent.toFixed(1)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-medium">Iterative Convergence</div>
                      <div className="text-muted-foreground">
                        PageRank-style with voucher weighting
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* LocalHealth Distribution & Algorithm Info */}
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                <CardContent className="space-y-5">
                  <div className="space-y-4">
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
                  <p className="text-xs text-muted-foreground italic pt-3">
                    Iterative PageRank-style computation where vouches are weighted by voucher strength.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Algorithm Analytics Section */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <BarChart3 className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Algorithm Analytics</h2>
                <p className="text-sm text-muted-foreground">Convergence telemetry, flow dynamics, and vouch strength distributions</p>
              </div>
            </div>
            
            <div className="space-y-8">
              <ConvergenceChart />
              <FlowSaturationCurve />
              <div className="grid lg:grid-cols-2 gap-8">
                <FlowRedundancyScatter />
                <VoucherStrengthHistogram />
              </div>
              <div className="grid lg:grid-cols-2 gap-8">
                <ConvergenceSensitivityChart />
                <RedundancyDepthChart />
              </div>
            </div>
          </section>

          {/* Network Timeline */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <TrendingUp className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Network Timeline</h2>
                <p className="text-sm text-muted-foreground">Vouch activity and user growth over real timestamps</p>
              </div>
            </div>
            
            <div className="space-y-8">
              <VouchTimelineChart />
              <GrowthCohortChart />
            </div>
          </section>

          {/* Algorithm Enhancements Section */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <Shield className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Security & Algorithm Enhancements</h2>
                <p className="text-sm text-muted-foreground">Vertex-disjoint paths, piecewise dilution curves, and adaptive baselines</p>
              </div>
            </div>
            
            <div className="space-y-8">
              <AdaptiveBaselineMonitor />
              <div className="grid lg:grid-cols-2 gap-8">
                <NetworkResilienceChart />
                <DilutionZonesChart />
              </div>
            </div>
          </section>

          {/* Network Health & Risk Section */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <AlertTriangle className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Network Health & Risks</h2>
                <p className="text-sm text-muted-foreground">Vulnerability detection, influence concentration, and resilience analysis</p>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="grid lg:grid-cols-2 gap-8">
                <VoucherInfluenceChart />
                <SybilRiskChart />
              </div>
              <div className="grid lg:grid-cols-2 gap-8">
                <EdgeFragilityChart />
                <DilutionPressureChart />
              </div>
            </div>
          </section>

          <Separator className="my-8" />

          {/* Global Stats */}
          <section>
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
          </section>
        </div>
      </div>
    </div>
  );
}
