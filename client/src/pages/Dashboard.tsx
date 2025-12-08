import { GlobalStats } from "@/components/GlobalStats";
import { RecentActivity } from "@/components/RecentActivity";
import { GHIGauge } from "@/components/GHIGauge";
import { STSHistogram } from "@/components/STSHistogram";
import { LocalHealthHistogram } from "@/components/LocalHealthHistogram";
import { ScoreDistribution } from "@/components/TrustDistribution";
import { NetworkGrowthChart } from "@/components/NetworkGrowthChart";
import { EndorsementVelocityChart } from "@/components/EndorsementVelocityChart";
import { ScoreComponentsChart } from "@/components/ScoreComponentsChart";
import { AverageSTSChart } from "@/components/AverageSTSChart";
import { NetworkDensityChart } from "@/components/NetworkDensityChart";
import { PathDiversityChart } from "@/components/PathDiversityChart";
import { NetworkSecurityHealth } from "@/components/NetworkSecurityHealth";
import { PageRankMetrics } from "@/components/PageRankMetrics";
import { LocalHealthGraph } from "@/components/graph/LocalHealthGraph";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { Users, Heart, TrendingUp, Network, ChevronDown, Activity } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

export default function Dashboard() {
  const [showCommunitySection, setShowCommunitySection] = useState(false);
  
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

  const { data: stsDistData, isLoading: isLoadingSTSDist } = useQuery<{
    distribution: { bin: string; count: number }[];
    percentiles: { p25: number; p50: number; p75: number; p95: number };
  }>({
    queryKey: ['/api/analytics/sts-distribution'],
  });

  const { data: tierDistData, isLoading: isLoadingTierDist } = useQuery<{
    distribution: Array<{ level: 'Connected' | 'Verified' | 'Trusted'; count: number; percentage: number }>;
  }>({
    queryKey: ['/api/analytics/tier-distribution'],
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

  const { data: averageSTSData, isLoading: isLoadingAverageSTS } = useQuery<{
    data: Array<{ epoch: string; mean: number; median: number; p25: number; p75: number }>;
  }>({
    queryKey: ['/api/analytics/average-sts'],
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

      {/* LocalHealth Analytics Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* LocalHealth Distribution & Algorithm Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Histogram - Takes 2 columns */}
            <div className="lg:col-span-2">
              {localHealthData && localHealthData.distribution.length > 0 && (
                <LocalHealthHistogram
                  distribution={localHealthData.distribution}
                  isLoading={isLoadingLocalHealth}
                />
              )}
            </div>
            
            {/* Algorithm Info Card */}
            <Card data-testid="card-local-health-algorithm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Recursive Trust Algorithm
                </CardTitle>
                <CardDescription>
                  How LocalHealth signals are computed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Flow Weight</span>
                    <Badge variant="outline">60%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Redundancy Weight</span>
                    <Badge variant="outline">40%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Scaling Exponent</span>
                    <Badge variant="outline">2.0</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Healthy Vouchers</span>
                    <Badge variant="secondary">8</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Healthy Redundancy</span>
                    <Badge variant="secondary">35</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic pt-2">
                  Iterative computation where each vouch is weighted by the voucher's LocalHealth score, creating true recursive trust propagation.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Network Growth Charts */}
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

          {/* Recent Activity */}
          <RecentActivity activities={recentActivities} />

          <Separator className="my-8" />

          {/* Community Health Section - Collapsible */}
          <Collapsible open={showCommunitySection} onOpenChange={setShowCommunitySection}>
            <CollapsibleTrigger className="flex items-center gap-3 w-full group" data-testid="button-toggle-community-section">
              <div className="flex items-center gap-3 flex-1">
                <Users className="w-6 h-6 text-muted-foreground" />
                <div className="text-left">
                  <h2 className="text-xl font-bold" data-testid="heading-community-reputation">Community Health Analytics</h2>
                  <p className="text-sm text-muted-foreground">
                    STS signals, GHI metrics, and network security indicators
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showCommunitySection ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-6 space-y-6">
              {/* Global Stats */}
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

              {/* GHI Card */}
              <Card data-testid="card-ghi">
                <CardHeader>
                  <CardTitle>Global Health Index</CardTitle>
                  <CardDescription>
                    Overall network health computed from size, connectivity, and stability metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingHealth ? (
                    <div className="flex items-center justify-center py-12" data-testid="loading-ghi">
                      <div className="text-muted-foreground">Loading health data...</div>
                    </div>
                  ) : healthData ? (
                    <div className="grid md:grid-cols-4 gap-6">
                      <div className="flex items-center justify-center">
                        <GHIGauge ghi={healthData.GHI} size="md" />
                      </div>
                      <Card className="flex flex-col justify-center" data-testid="card-metric-size">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Size Metric
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold" data-testid="text-size-value">
                            {healthData.metrics.sizeN}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {healthData.raw.acceptedCount} accepted users
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="flex flex-col justify-center" data-testid="card-metric-cut">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Cut Metric
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold" data-testid="text-cut-value">
                            {healthData.metrics.cutN}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Avg min-cut: {healthData.raw.avgMinCut.toFixed(1)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="flex flex-col justify-center" data-testid="card-metric-churn">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Churn Metric
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold" data-testid="text-churn-value">
                            {healthData.metrics.churnN}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(healthData.raw.churnStability * 100).toFixed(0)}% stability
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12" data-testid="text-no-health-data">
                      <div className="text-muted-foreground">No health data available</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* STS Analytics */}
              <div className="grid md:grid-cols-2 gap-6">
                <STSHistogram 
                  distribution={stsDistData?.distribution || []} 
                  percentiles={stsDistData?.percentiles || { p25: 0, p50: 0, p75: 0, p95: 0 }} 
                  isLoading={isLoadingSTSDist}
                />
                <ScoreDistribution 
                  distribution={tierDistData?.distribution || []} 
                  isLoading={isLoadingTierDist}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <ScoreComponentsChart 
                  data={scoreComponentsData?.data || []} 
                  isLoading={isLoadingScoreComponents}
                />
                <AverageSTSChart 
                  data={averageSTSData?.data || []} 
                  isLoading={isLoadingAverageSTS}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <NetworkDensityChart 
                  data={networkDensityData?.data || []} 
                  isLoading={isLoadingNetworkDensity}
                />
                <PathDiversityChart 
                  data={pathDiversityData} 
                  isLoading={isLoadingPathDiversity}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <NetworkSecurityHealth 
                  data={securityHealthData || null}
                  isLoading={isLoadingSecurityHealth}
                />
                <PageRankMetrics 
                  data={pageRankMetricsData || null}
                  isLoading={isLoadingPageRankMetrics}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
