import { GlobalStats } from "@/components/GlobalStats";
import { RecentActivity } from "@/components/RecentActivity";
import { TrustDistribution } from "@/components/TrustDistribution";
import { AcceptedUsersChart } from "@/components/AcceptedUsersChart";
import { STSHistogram } from "@/components/STSHistogram";
import { EndorsementMixChart } from "@/components/EndorsementMixChart";
import { PathDiversityChart } from "@/components/PathDiversityChart";
import { NetworkGrowthChart } from "@/components/NetworkGrowthChart";
import { AverageSTSChart } from "@/components/AverageSTSChart";
import { EndorsementVelocityChart } from "@/components/EndorsementVelocityChart";
import { ScoreComponentsChart } from "@/components/ScoreComponentsChart";
import { NetworkDensityChart } from "@/components/NetworkDensityChart";
import { GHIGauge } from "@/components/GHIGauge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
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
    queryKey: ['/api/epoch/0/health'],
  });

  // TODO: remove mock functionality
  const mockStats = {
    totalUsers: 12453,
    totalEndorsements: 28917,
    trustedUsers: 1842,
    avgScore: 0.87,
  };

  // Note: endorsement activities show endorsement type (Human/Known/Trusted)
  // User achievement tiers (Apprentice/Journeyer/Master) are shown in distribution
  const mockActivities = [
    {
      id: "1",
      type: "endorsement" as const,
      endorser: "0x742d...5f0bEb",
      endorsee: "alice.eth",
      level: "Trusted" as const,
      timestamp: "2025-10-27T14:30:00Z",
    },
    {
      id: "2",
      type: "score_update" as const,
      user: "bob.eth",
      newScore: 78,
      timestamp: "2025-10-27T14:15:00Z",
    },
    {
      id: "3",
      type: "endorsement" as const,
      endorser: "charlie.eth",
      endorsee: "0x1234...5678",
      level: "Known" as const,
      timestamp: "2025-10-27T14:00:00Z",
    },
    {
      id: "4",
      type: "endorsement" as const,
      endorser: "0xabcd...ef01",
      endorsee: "dave.eth",
      level: "Human" as const,
      timestamp: "2025-10-27T13:45:00Z",
    },
    {
      id: "5",
      type: "score_update" as const,
      user: "emma.eth",
      newScore: 65,
      timestamp: "2025-10-27T13:30:00Z",
    },
  ];

  const mockDistribution = [
    { level: "Master" as const, count: 1842, percentage: 15 },
    { level: "Journeyer" as const, count: 4361, percentage: 35 },
    { level: "Apprentice" as const, count: 6250, percentage: 50 },
  ];

  const mockAcceptedUsers = [
    { epoch: "Oct 20", apprentice: 4200, journeyer: 2100, master: 800 },
    { epoch: "Oct 21", apprentice: 4400, journeyer: 2250, master: 850 },
    { epoch: "Oct 22", apprentice: 4650, journeyer: 2400, master: 920 },
    { epoch: "Oct 23", apprentice: 4900, journeyer: 2550, master: 980 },
    { epoch: "Oct 24", apprentice: 5150, journeyer: 2700, master: 1050 },
    { epoch: "Oct 25", apprentice: 5400, journeyer: 2850, master: 1120 },
    { epoch: "Oct 26", apprentice: 5700, journeyer: 3000, master: 1200 },
    { epoch: "Oct 27", apprentice: 6250, journeyer: 4361, master: 1842 },
  ];

  const mockSTSDistribution = [
    { bin: "0-10", count: 120 },
    { bin: "10-20", count: 340 },
    { bin: "20-30", count: 820 },
    { bin: "30-40", count: 1450 },
    { bin: "40-50", count: 2100 },
    { bin: "50-60", count: 2600 },
    { bin: "60-70", count: 2200 },
    { bin: "70-80", count: 1500 },
    { bin: "80-90", count: 780 },
    { bin: "90-100", count: 543 },
  ];

  const mockEndorsementMix = [
    { epoch: "Oct 20", human: 8200, known: 5400, trusted: 2800 },
    { epoch: "Oct 21", human: 8500, known: 5600, trusted: 2950 },
    { epoch: "Oct 22", human: 8900, known: 5850, trusted: 3100 },
    { epoch: "Oct 23", human: 9300, known: 6100, trusted: 3280 },
    { epoch: "Oct 24", human: 9700, known: 6400, trusted: 3450 },
    { epoch: "Oct 25", human: 10200, known: 6700, trusted: 3650 },
    { epoch: "Oct 26", human: 10800, known: 7050, trusted: 3870 },
    { epoch: "Oct 27", human: 14500, known: 9600, trusted: 4817 },
  ];

  const mockPathDiversity = [
    { epoch: "Oct 20", min: 0.35, p25: 0.52, median: 0.68, p75: 0.81, max: 0.95 },
    { epoch: "Oct 21", min: 0.38, p25: 0.54, median: 0.69, p75: 0.82, max: 0.96 },
    { epoch: "Oct 22", min: 0.40, p25: 0.56, median: 0.71, p75: 0.83, max: 0.96 },
    { epoch: "Oct 23", min: 0.42, p25: 0.58, median: 0.72, p75: 0.84, max: 0.97 },
    { epoch: "Oct 24", min: 0.43, p25: 0.59, median: 0.73, p75: 0.85, max: 0.97 },
    { epoch: "Oct 25", min: 0.45, p25: 0.61, median: 0.74, p75: 0.86, max: 0.98 },
    { epoch: "Oct 26", min: 0.47, p25: 0.63, median: 0.76, p75: 0.87, max: 0.98 },
    { epoch: "Oct 27", min: 0.48, p25: 0.64, median: 0.77, p75: 0.88, max: 0.99 },
  ];

  const mockNetworkGrowth = [
    { epoch: "Oct 20", totalUsers: 7100, activeUsers: 5680 },
    { epoch: "Oct 21", totalUsers: 7500, activeUsers: 6000 },
    { epoch: "Oct 22", totalUsers: 7970, activeUsers: 6376 },
    { epoch: "Oct 23", totalUsers: 8430, activeUsers: 6744 },
    { epoch: "Oct 24", totalUsers: 8900, activeUsers: 7120 },
    { epoch: "Oct 25", totalUsers: 9370, activeUsers: 7496 },
    { epoch: "Oct 26", totalUsers: 9900, activeUsers: 7920 },
    { epoch: "Oct 27", totalUsers: 12453, activeUsers: 9962 },
  ];

  const mockAverageSTS = [
    { epoch: "Oct 20", mean: 52, median: 51, p25: 38, p75: 67 },
    { epoch: "Oct 21", mean: 53, median: 52, p25: 39, p75: 68 },
    { epoch: "Oct 22", mean: 54, median: 53, p25: 40, p75: 69 },
    { epoch: "Oct 23", mean: 55, median: 54, p25: 41, p75: 70 },
    { epoch: "Oct 24", mean: 56, median: 55, p25: 42, p75: 71 },
    { epoch: "Oct 25", mean: 57, median: 56, p25: 43, p75: 72 },
    { epoch: "Oct 26", mean: 57, median: 57, p25: 43, p75: 73 },
    { epoch: "Oct 27", mean: 58, median: 58, p25: 42, p75: 74 },
  ];

  const mockEndorsementVelocity = [
    { epoch: "Oct 20", newEndorsements: 2450, revokedEndorsements: 120 },
    { epoch: "Oct 21", newEndorsements: 2680, revokedEndorsements: 95 },
    { epoch: "Oct 22", newEndorsements: 2820, revokedEndorsements: 110 },
    { epoch: "Oct 23", newEndorsements: 3100, revokedEndorsements: 130 },
    { epoch: "Oct 24", newEndorsements: 3350, revokedEndorsements: 105 },
    { epoch: "Oct 25", newEndorsements: 3720, revokedEndorsements: 125 },
    { epoch: "Oct 26", newEndorsements: 4150, revokedEndorsements: 140 },
    { epoch: "Oct 27", newEndorsements: 5200, revokedEndorsements: 85 },
  ];

  const mockScoreComponents = [
    { epoch: "Oct 20", flow: 28, cut: 13, stability: 5, depth: 6 },
    { epoch: "Oct 21", flow: 29, cut: 13, stability: 5, depth: 6 },
    { epoch: "Oct 22", flow: 30, cut: 14, stability: 5, depth: 5 },
    { epoch: "Oct 23", flow: 30, cut: 14, stability: 5, depth: 6 },
    { epoch: "Oct 24", flow: 31, cut: 14, stability: 5, depth: 6 },
    { epoch: "Oct 25", flow: 31, cut: 14, stability: 6, depth: 6 },
    { epoch: "Oct 26", flow: 31, cut: 15, stability: 6, depth: 5 },
    { epoch: "Oct 27", flow: 32, cut: 15, stability: 6, depth: 5 },
  ];

  const mockNetworkDensity = [
    { epoch: "Oct 20", endorsementsPerUser: 2.3, avgPathLength: 3.8 },
    { epoch: "Oct 21", endorsementsPerUser: 2.25, avgPathLength: 3.7 },
    { epoch: "Oct 22", endorsementsPerUser: 2.28, avgPathLength: 3.6 },
    { epoch: "Oct 23", endorsementsPerUser: 2.31, avgPathLength: 3.5 },
    { epoch: "Oct 24", endorsementsPerUser: 2.27, avgPathLength: 3.4 },
    { epoch: "Oct 25", endorsementsPerUser: 2.32, avgPathLength: 3.3 },
    { epoch: "Oct 26", endorsementsPerUser: 2.36, avgPathLength: 3.2 },
    { epoch: "Oct 27", endorsementsPerUser: 2.32, avgPathLength: 3.1 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Network Dashboard</h1>
        <p className="text-muted-foreground">
          Global statistics and activity across the trust network
        </p>
      </div>

      <div className="space-y-6">
        <GlobalStats stats={mockStats} />

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
        
        <div className="grid lg:grid-cols-2 gap-6">
          <NetworkGrowthChart data={mockNetworkGrowth} />
          <AverageSTSChart data={mockAverageSTS} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <AcceptedUsersChart data={mockAcceptedUsers} />
          <STSHistogram 
            distribution={mockSTSDistribution}
            percentiles={{ p25: 42, p50: 58, p75: 74, p95: 89 }}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <EndorsementVelocityChart data={mockEndorsementVelocity} />
          <EndorsementMixChart data={mockEndorsementMix} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <ScoreComponentsChart data={mockScoreComponents} />
          <NetworkDensityChart data={mockNetworkDensity} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <PathDiversityChart data={mockPathDiversity} />
          <TrustDistribution distribution={mockDistribution} />
        </div>
        
        <RecentActivity activities={mockActivities} />
      </div>
    </div>
  );
}
