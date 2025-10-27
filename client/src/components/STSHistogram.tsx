import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface STSHistogramProps {
  distribution: { bin: string; count: number }[];
  percentiles: { p25: number; p50: number; p75: number; p95: number };
}

export function STSHistogram({ distribution, percentiles }: STSHistogramProps) {
  const maxCount = Math.max(...distribution.map(d => d.count));

  return (
    <Card data-testid="card-sts-histogram">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          STS Distribution
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Histogram with percentile markers (P25, P50, P75, P95)
        </p>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
