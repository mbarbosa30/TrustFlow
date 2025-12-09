import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DiversityDistribution {
  min: number;
  p25: number;
  median: number;
  p75: number;
  max: number;
  count: number;
}

interface PathDiversityChartProps {
  data?: DiversityDistribution;
  isLoading?: boolean;
}

export function PathDiversityChart({ data, isLoading = false }: PathDiversityChartProps) {
  return (
    <Card data-testid="card-path-diversity">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Path Diversity Index
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Distribution of redundant trust paths across all users
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]" data-testid="loading-path-diversity">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Loading path diversity data...</p>
            </div>
          </div>
        ) : !data || data.count === 0 ? (
          <div className="flex items-center justify-center h-[200px]" data-testid="text-no-path-diversity">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No path diversity data available yet</p>
              <p className="text-xs mt-1">This metric will be computed in future epoch calculations</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Current Network Distribution ({data.count} accepted users)
                </div>
                <div className="relative h-16 flex items-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-3 bg-muted rounded" />
                    <div
                      className="absolute h-3 bg-accent rounded"
                      style={{
                        left: `${data.p25 * 100}%`,
                        width: `${(data.p75 - data.p25) * 100}%`,
                      }}
                      data-testid="bar-diversity-iqr"
                    />
                    <div
                      className="absolute w-1 h-8 rounded"
                      style={{ left: `${data.median * 100}%`, backgroundColor: 'hsl(var(--score-river))' }}
                      data-testid="bar-diversity-median"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground" data-testid="text-diversity-min">
                    Min: {(data.min * 100).toFixed(0)}%
                  </span>
                  <span className="font-medium" data-testid="text-diversity-median">
                    Median: {(data.median * 100).toFixed(0)}%
                  </span>
                  <span className="text-muted-foreground" data-testid="text-diversity-max">
                    Max: {(data.max * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">25th Percentile</div>
                  <div className="text-lg font-semibold" data-testid="text-diversity-p25">
                    {(data.p25 * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">75th Percentile</div>
                  <div className="text-lg font-semibold" data-testid="text-diversity-p75">
                    {(data.p75 * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Range</div>
                  <div className="text-lg font-semibold" data-testid="text-diversity-range">
                    {((data.max - data.min) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 text-xs text-muted-foreground">
              <p>Path diversity represents the fraction of flow from redundant sources. Higher values indicate stronger Sybil resistance.</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
