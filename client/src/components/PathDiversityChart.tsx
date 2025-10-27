import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EpochDiversity {
  epoch: string;
  min: number;
  p25: number;
  median: number;
  p75: number;
  max: number;
}

interface PathDiversityChartProps {
  data: EpochDiversity[];
}

export function PathDiversityChart({ data }: PathDiversityChartProps) {
  return (
    <Card data-testid="card-path-diversity">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Path Diversity Index
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Share of flow from disjoint regions (higher = more collusion-resistant)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((point, index) => (
            <div key={index} className="space-y-2">
              <div className="text-xs text-muted-foreground font-mono">
                {point.epoch}
              </div>
              <div className="relative h-12 flex items-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full h-2 bg-muted rounded" />
                  <div
                    className="absolute h-2 bg-accent rounded"
                    style={{
                      left: `${point.p25 * 100}%`,
                      width: `${(point.p75 - point.p25) * 100}%`,
                    }}
                  />
                  <div
                    className="absolute w-1 h-6 bg-primary rounded"
                    style={{ left: `${point.median * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  Min: {(point.min * 100).toFixed(0)}%
                </span>
                <span className="font-medium">
                  Median: {(point.median * 100).toFixed(0)}%
                </span>
                <span className="text-muted-foreground">
                  Max: {(point.max * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          <p>Box plot per epoch showing distribution of path diversity. Higher diversity indicates more independent trust sources.</p>
        </div>
      </CardContent>
    </Card>
  );
}
