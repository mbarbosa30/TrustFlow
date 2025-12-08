import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

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
                      <div className="text-2xl font-bold text-green-600" data-testid="text-scores-updated">
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
                                    <span className="text-green-600 text-xs">Success</span>
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
    </div>
  );
}
