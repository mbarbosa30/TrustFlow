import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface STSHistogramProps {
  distribution: { bin: string; count: number }[];
  percentiles: { p25: number; p50: number; p75: number; p95: number };
  isLoading?: boolean;
}

export function STSHistogram({ distribution, percentiles, isLoading = false }: STSHistogramProps) {
  const maxCount = distribution.length > 0 ? Math.max(...distribution.map(d => d.count)) : 0;

  return (
    <Card data-testid="card-sts-histogram">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          STS Distribution
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Score distribution in current epoch with percentile markers
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12" data-testid="loading-sts-distribution">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Loading score distribution data...</p>
            </div>
          </div>
        ) : distribution.length === 0 ? (
          <div className="flex items-center justify-center py-12" data-testid="text-no-sts-distribution">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No score distribution data available yet</p>
              <p className="text-xs mt-1">Scores will appear after users receive trust scores</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {distribution.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-12">{item.bin}</span>
                  <div className="flex-1 relative">
                    <div className="h-8 bg-primary/20 rounded overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${(item.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-medium w-12 text-right">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <div className="text-xs font-semibold mb-2">Percentiles</div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold">{percentiles.p25}</div>
                  <div className="text-xs text-muted-foreground">P25</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{percentiles.p50}</div>
                  <div className="text-xs text-muted-foreground">P50</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{percentiles.p75}</div>
                  <div className="text-xs text-muted-foreground">P75</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{percentiles.p95}</div>
                  <div className="text-xs text-muted-foreground">P95</div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
