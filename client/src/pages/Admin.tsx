import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Download, BarChart3 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";

interface RecalculationDetail {
  address: string;
  localHealth: number;
  error?: string;
}

interface RecalculationResult {
  totalProcessed: number;
  scoresUpdated: number;
  errors: number;
  duration: number;
  details: RecalculationDetail[];
}

interface NetworkReport {
  generatedAt: string;
  networkSummary: {
    totalUsers: number;
    usersWithScores: number;
    totalVouches: number;
    totalParticipants: number;
    graphDensity: number;
    avgLocalHealth: number;
    medianLocalHealth: number;
    minLocalHealth: number;
    maxLocalHealth: number;
    stdDevLocalHealth: number;
  };
  scoreDistribution: Array<{ bucket: string; count: number; percentage: number }>;
  componentBreakdown: {
    flowComponent: { avg: number; median: number; min: number; max: number; stdDev: number; count: number };
    redundancyComponent: { avg: number; median: number; min: number; max: number; stdDev: number; count: number };
    actualMinCut: { avg: number; median: number; min: number; max: number; stdDev: number; count: number };
    dilutionFactor: { avg: number; median: number; min: number; max: number; stdDev: number; count: number };
    incomingActive: { avg: number; median: number; min: number; max: number; stdDev: number; count: number };
    outgoingTotal: { avg: number; median: number; min: number; max: number; stdDev: number; count: number };
  };
  vouchGraphStats: {
    avgVouchesGiven: number;
    medianVouchesGiven: number;
    maxVouchesGiven: number;
    avgVouchesReceived: number;
    medianVouchesReceived: number;
    maxVouchesReceived: number;
    usersWhoVouched: number;
    usersWhoReceivedVouches: number;
  };
  chainDistribution: Array<{ chainNamespace: string; count: number; percentage: number }>;
  outliers: Array<{ address: string; localHealth: number; incomingVouches: number; outgoingVouches: number; anomalyType: string }>;
  outlierCount: number;
}

export default function Admin() {
  const [result, setResult] = useState<RecalculationResult | null>(null);

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/recalculate-network');
      const json = await response.json();
      return json.result as RecalculationResult;
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const networkReportQuery = useQuery<NetworkReport>({
    queryKey: ['/api/admin/network-report'],
    enabled: false,
    staleTime: 0,
    gcTime: 0,
  });

  const handleDownloadReport = async () => {
    // Always fetch fresh data for each download
    const result = await networkReportQuery.refetch();
    const reportData = result.data;
    
    if (reportData) {
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maxflow-network-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">
          Network management and maintenance tools
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Network Recalculation
          </CardTitle>
          <CardDescription>
            Recalculate all signal scores using the current algorithm: iterative PageRank-style computation with adaptive baselines (75th percentile), piecewise dilution curves (smooth 4-zone decay), vertex-disjoint path bonuses, and quadratic scaling. Max score capped at 99.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <Button
              onClick={() => recalculateMutation.mutate()}
              disabled={recalculateMutation.isPending}
              className="w-full sm:w-auto"
              data-testid="button-recalculate-network"
            >
              {recalculateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recalculating Network...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recalculate All Scores
                </>
              )}
            </Button>

            {recalculateMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to recalculate network: {(recalculateMutation.error as Error).message}
                </AlertDescription>
              </Alert>
            )}

            {recalculateMutation.isSuccess && result && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 h-4" />
                  <AlertDescription>
                    Network recalculation complete in {(result.duration / 1000).toFixed(2)} seconds
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold" data-testid="text-total-processed">
                        {result.totalProcessed}
                      </div>
                      <p className="text-xs text-muted-foreground">Total Processed</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold" style={{ color: 'hsl(var(--score-growth))' }} data-testid="text-scores-updated">
                        {result.scoresUpdated}
                      </div>
                      <p className="text-xs text-muted-foreground">Scores Updated</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-red-600" data-testid="text-errors">
                        {result.errors}
                      </div>
                      <p className="text-xs text-muted-foreground">Errors</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold" data-testid="text-duration">
                        {(result.duration / 1000).toFixed(1)}s
                      </div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                    </CardContent>
                  </Card>
                </div>

                {result.details.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Score Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b">
                            <tr>
                              <th className="text-left py-2">Address</th>
                              <th className="text-right py-2">Signal</th>
                              <th className="text-left py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.details.map((detail, idx) => (
                              <tr key={idx} className="border-b last:border-0">
                                <td className="py-2 font-mono text-xs">
                                  {detail.address.slice(0, 6)}...{detail.address.slice(-4)}
                                </td>
                                <td className="text-right font-semibold">
                                  {detail.localHealth.toFixed(2)}
                                </td>
                                <td className="py-2">
                                  {detail.error ? (
                                    <span className="text-red-600 text-xs">{detail.error}</span>
                                  ) : (
                                    <span className="text-xs" style={{ color: 'hsl(var(--score-growth))' }}>Success</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Network Analytics Report
          </CardTitle>
          <CardDescription>
            Generate a comprehensive JSON report with score distributions, algorithm component breakdowns, vouch graph statistics, and chain distribution for algorithm analysis and improvement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <Button
              onClick={handleDownloadReport}
              disabled={networkReportQuery.isFetching}
              className="w-full sm:w-auto"
              data-testid="button-download-report"
            >
              {networkReportQuery.isFetching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Network Report (JSON)
                </>
              )}
            </Button>

            {networkReportQuery.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to generate report: {(networkReportQuery.error as Error).message}
                </AlertDescription>
              </Alert>
            )}

            {networkReportQuery.data && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Report generated at {new Date(networkReportQuery.data.generatedAt).toLocaleString()}
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold" data-testid="text-total-users">
                        {networkReportQuery.data.networkSummary.totalUsers}
                      </div>
                      <p className="text-xs text-muted-foreground">Total Users</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold" data-testid="text-total-vouches">
                        {networkReportQuery.data.networkSummary.totalVouches}
                      </div>
                      <p className="text-xs text-muted-foreground">Total Vouches</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold" style={{ color: 'hsl(var(--score-growth))' }} data-testid="text-avg-signal">
                        {networkReportQuery.data.networkSummary.avgLocalHealth.toFixed(1)}
                      </div>
                      <p className="text-xs text-muted-foreground">Avg Signal</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold" data-testid="text-graph-density">
                        {(networkReportQuery.data.networkSummary.graphDensity * 100).toFixed(2)}%
                      </div>
                      <p className="text-xs text-muted-foreground">Graph Density</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Signal Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {networkReportQuery.data.scoreDistribution.map((bucket) => (
                        <div key={bucket.bucket} className="flex items-center gap-3">
                          <span className="w-16 text-sm font-mono text-muted-foreground">{bucket.bucket}</span>
                          <Progress value={bucket.percentage} className="flex-1 h-4" />
                          <span className="w-20 text-sm text-right">
                            {bucket.count} ({bucket.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {networkReportQuery.data.chainDistribution.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Chain Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {networkReportQuery.data.chainDistribution.map((chain) => (
                          <div key={chain.chainNamespace} className="flex items-center gap-3">
                            <span className="w-20 text-sm font-mono text-muted-foreground">{chain.chainNamespace}</span>
                            <Progress value={chain.percentage} className="flex-1 h-4" />
                            <span className="w-20 text-sm text-right">
                              {chain.count} ({chain.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {networkReportQuery.data.outlierCount > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Potential Outliers ({networkReportQuery.data.outlierCount})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b">
                            <tr>
                              <th className="text-left py-2">Address</th>
                              <th className="text-right py-2">Signal</th>
                              <th className="text-right py-2">In</th>
                              <th className="text-right py-2">Out</th>
                              <th className="text-left py-2">Anomaly</th>
                            </tr>
                          </thead>
                          <tbody>
                            {networkReportQuery.data.outliers.slice(0, 20).map((outlier, idx) => (
                              <tr key={idx} className="border-b last:border-0">
                                <td className="py-2 font-mono text-xs">
                                  {outlier.address.slice(0, 6)}...{outlier.address.slice(-4)}
                                </td>
                                <td className="text-right font-semibold">{outlier.localHealth}</td>
                                <td className="text-right">{outlier.incomingVouches}</td>
                                <td className="text-right">{outlier.outgoingVouches}</td>
                                <td className="py-2 text-xs text-muted-foreground">{outlier.anomalyType.replace(/_/g, ' ')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
