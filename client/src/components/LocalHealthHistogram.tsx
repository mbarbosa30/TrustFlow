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
            {distribution.map((item, index) => {
              // Semantic color based on score range
              const binStart = parseInt(item.bin.split('-')[0]) || 0;
              let barColor = '--score-stone';    // 0-19: seedling/potential
              let bgColor = '--score-stone';
              if (binStart >= 80) {
                barColor = '--score-canopy';     // 80-100: peak health
                bgColor = '--score-canopy';
              } else if (binStart >= 60) {
                barColor = '--score-growth';     // 60-79: water-fed expansion
                bgColor = '--score-growth';
              } else if (binStart >= 40) {
                barColor = '--score-sun';        // 40-59: activation energy
                bgColor = '--score-sun';
              } else if (binStart >= 20) {
                barColor = '--score-soil';       // 20-39: grounded stability
                bgColor = '--score-soil';
              }
              
              return (
                <div key={index} className="flex items-center gap-3 group">
                  <span className="text-xs text-muted-foreground w-16 font-mono">{item.bin}</span>
                  <div className="flex-1 relative">
                    <div 
                      className="h-8 rounded-md overflow-hidden transition-all duration-300"
                      style={{ backgroundColor: `hsl(var(${bgColor}) / 0.15)` }}
                    >
                      <div
                        className="h-full transition-all duration-500 ease-out group-hover:opacity-90"
                        style={{ 
                          backgroundColor: `hsl(var(${barColor}))`, 
                          width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` 
                        }}
                        data-testid={`bar-local-health-${item.bin}`}
                      />
                    </div>
                  </div>
                  <span 
                    className="text-xs font-medium w-12 text-right tabular-nums" 
                    style={{ color: `hsl(var(${barColor}))` }}
                    data-testid={`count-local-health-${item.bin}`}
                  >
                    {item.count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
