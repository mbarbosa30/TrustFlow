import { GlobalStats } from "@/components/GlobalStats";
import { RecentActivity } from "@/components/RecentActivity";
import { GHIGauge } from "@/components/GHIGauge";
import { STSHistogram } from "@/components/STSHistogram";
import { TrustDistribution } from "@/components/TrustDistribution";
import { NetworkGrowthChart } from "@/components/NetworkGrowthChart";
import { EndorsementVelocityChart } from "@/components/EndorsementVelocityChart";
import { ScoreComponentsChart } from "@/components/ScoreComponentsChart";
import { AverageSTSChart } from "@/components/AverageSTSChart";
import { NetworkDensityChart } from "@/components/NetworkDensityChart";
import { PathDiversityChart } from "@/components/PathDiversityChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { data: epochData } = useQuery<{ epochId: number }>({
    queryKey: ['/api/epoch/current'],
  });

  const currentEpochId = epochData?.epochId ?? 0;

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
    distribution: Array<{ level: 'Apprentice' | 'Journeyer' | 'Master'; count: number; percentage: number }>;
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
    data: Array<{ epoch: string; flow: number; cut: number; stability: number; depth: number }>;
  }>({
    queryKey: ['/api/analytics/score-components'],
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
    data: Array<{ epoch: string; min: number; p25: number; median: number; p75: number; max: number }>;
  }>({
    queryKey: ['/api/analytics/path-diversity'],
  });

  const recentActivities = recentEndorsementsData?.endorsements.map(e => ({
    id: e.id.toString(),
    type: "endorsement" as const,
    endorser: `${e.endorser.slice(0, 6)}...${e.endorser.slice(-4)}`,
    endorsee: `${e.endorsee.slice(0, 6)}...${e.endorsee.slice(-4)}`,
    timestamp: new Date(e.createdAt).toISOString(),
  })) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Network Dashboard</h1>
            <p className="text-muted-foreground">
              Global statistics and activity across the trust network
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Current Epoch</div>
            <div className="text-3xl font-bold font-mono" data-testid="text-dashboard-epoch">
              {currentEpochId}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
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
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">No network statistics available</div>
            </CardContent>
          </Card>
        )}

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
          <STSHistogram 
            distribution={stsDistData?.distribution || []} 
            percentiles={stsDistData?.percentiles || { p25: 0, p50: 0, p75: 0, p95: 0 }} 
            isLoading={isLoadingSTSDist}
          />
          <TrustDistribution 
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
            data={pathDiversityData?.data || []} 
            isLoading={isLoadingPathDiversity}
          />
        </div>
        
        <RecentActivity activities={recentActivities} />
      </div>
    </div>
  );
}
