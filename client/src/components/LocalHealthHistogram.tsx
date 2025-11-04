import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LocalHealthHistogramProps {
  distribution: { bin: string; count: number }[];
  isLoading?: boolean;
}

export function LocalHealthHistogram({ distribution, isLoading = false }: LocalHealthHistogramProps) {
  const maxCount = distribution.length > 0 ? Math.max(...distribution.map(d => d.count)) : 0;

  return (
    <Card data-testid="card-local-health-histogram">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          LocalHealth Distribution
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Personal network quality scores (0-100 scale)
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12" data-testid="loading-local-health-distribution">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Loading LocalHealth distribution data...</p>
            </div>
          </div>
        ) : distribution.length === 0 ? (
          <div className="flex items-center justify-center py-12" data-testid="text-no-local-health-distribution">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No LocalHealth distribution data available yet</p>
              <p className="text-xs mt-1">Scores will appear after users create ego contexts</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {distribution.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16">{item.bin}</span>
                <div className="flex-1 relative">
                  <div className="h-8 bg-primary/20 rounded overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
                      data-testid={`bar-local-health-${item.bin}`}
                    />
                  </div>
                </div>
                <span className="text-xs font-medium w-12 text-right" data-testid={`count-local-health-${item.bin}`}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
