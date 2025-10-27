import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GHIGauge } from "@/components/GHIGauge";
import { Badge } from "@/components/ui/badge";
import { Info, TrendingUp, Users, Network, GitBranch, Shield, Activity, BarChart3, Shuffle } from "lucide-react";

export default function Status() {
  const { data: healthData, isLoading } = useQuery<{
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

  const getHealthStatus = (ghi: number) => {
    if (ghi >= 80) return { label: "Excellent", color: "bg-green-600 dark:bg-green-400" };
    if (ghi >= 60) return { label: "Good", color: "bg-blue-600 dark:bg-blue-400" };
    if (ghi >= 40) return { label: "Fair", color: "bg-yellow-600 dark:bg-yellow-400" };
    return { label: "Poor", color: "bg-red-600 dark:bg-red-400" };
  };

  const metricExplanations = [
    {
      icon: Users,
      name: "Network Size",
      key: "sizeN",
      description: "Measures the number of accepted users in the trust network",
      why: "Larger networks are more resilient to manipulation and provide better coverage. Size is log-scaled to prevent dominance over other metrics.",
      formula: "min(1, log(1+|A|)/log(1+target))"
    },
    {
      icon: Network,
      name: "Min-Cut Redundancy",
      key: "cutN",
      description: "Average minimum cut between users and the seed set",
      why: "Higher min-cut means more independent paths exist between users and seeds, making the network resistant to collusion and Sybil attacks.",
      formula: "min(1, avgMinCut/3)"
    },
    {
      icon: Shuffle,
      name: "Churn Stability",
      key: "churnN",
      description: "Measures how stable the accepted user set is between epochs",
      why: "Low churn indicates a mature, stable network. High churn may signal manipulation attempts or network instability.",
      formula: "1 − |A_t △ A_{t−1}| / |A_t ∪ A_{t−1}|"
    }
  ];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading system status...</div>
        </div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">No status data available</div>
        </div>
      </div>
    );
  }

  const status = getHealthStatus(healthData.GHI);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">System Status</h1>
        <p className="text-muted-foreground">
          Real-time health metrics for the TrustFlow network
        </p>
      </div>

      <div className="space-y-8">
        <Card data-testid="card-status-hero">
          <CardHeader>
            <CardTitle className="text-2xl">Global Health Index</CardTitle>
            <CardDescription>
              Overall network health score computed from 9 independent metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <div className="flex flex-col items-center justify-center">
                <GHIGauge ghi={healthData.GHI} size="lg" />
              </div>
              
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-3">
                  <Badge className={`${status.color} text-white`} data-testid="badge-health-status">
                    {status.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground font-mono">
                    Epoch {healthData.epoch}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm">
                    The Global Health Index (GHI) measures how trustable the system is at this epoch. 
                    It combines multiple independent graph health metrics to provide a single, 
                    explainable score that affects every user's confidence level.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    When the network is healthy, confidence scores are high. When the graph is brittle 
                    or manipulated, everyone's confidence drops—by design.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <div className="text-2xl font-bold" data-testid="text-accepted-count">
                      {healthData.raw.acceptedCount.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Accepted Users</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold" data-testid="text-avg-mincut">
                      {healthData.raw.avgMinCut.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">Avg Min-Cut</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold" data-testid="text-churn">
                      {(healthData.raw.churnStability * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Stability</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-2xl font-bold mb-4">Core Health Metrics</h2>
          <div className="grid lg:grid-cols-3 gap-6">
            <Card data-testid="card-metric-size">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Network Size
                  </CardTitle>
                  <div className="text-2xl font-bold" data-testid="text-metric-size">
                    {healthData.metrics.sizeN}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    {healthData.raw.acceptedCount.toLocaleString()} accepted users in the network
                  </p>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${healthData.metrics.sizeN * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-metric-cut">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    Min-Cut Redundancy
                  </CardTitle>
                  <div className="text-2xl font-bold" data-testid="text-metric-cut">
                    {healthData.metrics.cutN}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    Average {healthData.raw.avgMinCut.toFixed(1)} independent paths to seeds
                  </p>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${healthData.metrics.cutN * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-metric-churn">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Shuffle className="w-4 h-4" />
                    Churn Stability
                  </CardTitle>
                  <div className="text-2xl font-bold" data-testid="text-metric-churn">
                    {healthData.metrics.churnN}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    {(healthData.raw.churnStability * 100).toFixed(0)}% of users remain between epochs
                  </p>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${healthData.metrics.churnN * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card data-testid="card-metric-explanations">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Understanding the Metrics
            </CardTitle>
            <CardDescription>
              What each metric measures and why it matters for network health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {metricExplanations.map((metric) => {
                const Icon = metric.icon;
                const value = healthData.metrics[metric.key as keyof typeof healthData.metrics];
                
                return (
                  <div key={metric.key} className="space-y-2" data-testid={`explanation-${metric.key}`}>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold">{metric.name}</h3>
                          <span className="text-sm font-mono text-muted-foreground">
                            {value}
                          </span>
                        </div>
                        <p className="text-sm mb-2">{metric.description}</p>
                        <div className="bg-muted/50 rounded-md p-3 space-y-2">
                          <p className="text-sm">
                            <span className="font-medium">Why it matters:</span> {metric.why}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            Formula: {metric.formula}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-confidence-calculation">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              How Confidence is Calculated
            </CardTitle>
            <CardDescription>
              User confidence is primarily a property of the system, not individual users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Global Component (85% weight)</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  The Global Health Index (GHI) forms the base of every user's confidence score. 
                  When the network is unhealthy, everyone's confidence is low—by design.
                </p>
                <div className="bg-muted/50 rounded-md p-3">
                  <code className="text-xs font-mono">
                    GHI = 100 × (0.18×sizeN + 0.18×cutN + 0.14×condN + 0.10×fiedN + 
                    0.10×giniN + 0.08×satN + 0.08×matN + 0.08×repN + 0.06×churnN)
                  </code>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Local Adjustment (15% weight)</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  A small local adjustment ensures obviously brittle users don't get inflated scores:
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li>User's min-cut to seed set (redundancy of trust paths)</li>
                  <li>Edge perturbation stability (robustness to small changes)</li>
                  <li>Seed coverage (fraction of seeds contributing flow)</li>
                </ul>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Final Formula</h3>
                <div className="bg-muted/50 rounded-md p-3">
                  <code className="text-xs font-mono">
                    Confidence = GHI × (0.85 + 0.15 × localAdjustment)
                  </code>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This ensures confidence is explainable, hard to game locally when the network 
                  is small or brittle, and scales naturally as the graph matures.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-system-design">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Design Principles
            </CardTitle>
            <CardDescription>
              Why TrustFlow measures health this way
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Global-First Approach
                </h3>
                <p className="text-sm text-muted-foreground">
                  Confidence primarily reflects how healthy and robust the whole graph is, 
                  not just a user's local neighborhood. This makes the system resistant to 
                  localized manipulation.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Sybil Resistance
                </h3>
                <p className="text-sm text-muted-foreground">
                  By emphasizing graph-wide redundancy and expansion metrics, the system 
                  makes it expensive for attackers to create isolated clusters of fake accounts.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Transparency
                </h3>
                <p className="text-sm text-muted-foreground">
                  All metrics, weights, and formulas are published in the epoch bundle. 
                  Anyone can verify the GHI calculation and understand what drives confidence.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Explainability
                </h3>
                <p className="text-sm text-muted-foreground">
                  Rather than a black-box score, GHI breaks down into interpretable components. 
                  Users can see exactly which aspects of network health are strong or weak.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
