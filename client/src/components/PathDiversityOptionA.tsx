import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EpochDiversity {
  epoch: string;
  min: number;
  p25: number;
  median: number;
  p75: number;
  max: number;
}

interface PathDiversityOptionAProps {
  data: EpochDiversity[];
}

export function PathDiversityOptionA({ data }: PathDiversityOptionAProps) {
  if (!data || data.length === 0) {
    return (
      <Card data-testid="card-path-diversity-a">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Option A: Aggregated Distribution
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            No data available
          </p>
        </CardHeader>
      </Card>
    );
  }

  const recentData = data.length >= 6 ? data.slice(-6) : data;
  
  const allValues: number[] = [];
  recentData.forEach(epoch => {
    allValues.push(epoch.min, epoch.p25, epoch.median, epoch.p75, epoch.max);
  });
  
  allValues.sort((a, b) => a - b);
  
  const aggregated = {
    min: Math.min(...allValues),
    p25: allValues[Math.floor(allValues.length * 0.25)],
    median: allValues[Math.floor(allValues.length * 0.5)],
    p75: allValues[Math.floor(allValues.length * 0.75)],
    max: Math.max(...allValues),
  };

  return (
    <Card data-testid="card-path-diversity-a">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Option A: Aggregated Distribution
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Overall diversity distribution across last {recentData.length} epochs
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground font-mono">
            Epochs {recentData[0].epoch} - {recentData[recentData.length - 1].epoch}
          </div>
          <div className="relative h-12 flex items-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-2 bg-muted rounded" />
              <div
                className="absolute h-2 rounded"
                style={{
                  left: `${aggregated.p25 * 100}%`,
                  width: `${(aggregated.p75 - aggregated.p25) * 100}%`,
                  backgroundColor: 'hsl(var(--score-growth))'
                }}
              />
              <div
                className="absolute w-1 h-6 rounded"
                style={{ left: `${aggregated.median * 100}%`, backgroundColor: 'hsl(var(--score-canopy))' }}
              />
            </div>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              Min: {(aggregated.min * 100).toFixed(0)}%
            </span>
            <span className="font-medium">
              Median: {(aggregated.median * 100).toFixed(0)}%
            </span>
            <span className="text-muted-foreground">
              Max: {(aggregated.max * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          <p>Single aggregated view combining all diversity scores from recent epochs.</p>
        </div>
      </CardContent>
    </Card>
  );
}
