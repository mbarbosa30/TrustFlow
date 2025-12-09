import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EpochMix {
  epoch: string;
  human: number;
  known: number;
  trusted: number;
}

interface EndorsementMixChartProps {
  data: EpochMix[];
}

export function EndorsementMixChart({ data }: EndorsementMixChartProps) {
  return (
    <Card data-testid="card-endorsement-mix">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Endorsement Mix Over Time
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Share of Human / Known / Strong endorsements among effective edges
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((point, index) => {
            const total = point.human + point.known + point.trusted;
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-mono">{point.epoch}</span>
                  <span className="font-semibold">{total.toLocaleString()} edges</span>
                </div>
                <div className="h-6 flex rounded overflow-hidden">
                  <div
                    className="flex items-center justify-center text-xs text-white"
                    style={{ width: `${(point.trusted / total) * 100}%`, backgroundColor: 'hsl(var(--score-canopy))' }}
                    title={`Strong: ${((point.trusted / total) * 100).toFixed(1)}%`}
                  />
                  <div
                    className="flex items-center justify-center text-xs text-white"
                    style={{ width: `${(point.known / total) * 100}%`, backgroundColor: 'hsl(var(--score-growth))' }}
                    title={`Known: ${((point.known / total) * 100).toFixed(1)}%`}
                  />
                  <div
                    className="flex items-center justify-center text-xs"
                    style={{ width: `${(point.human / total) * 100}%`, backgroundColor: 'hsl(var(--score-seedling))' }}
                    title={`Human: ${((point.human / total) * 100).toFixed(1)}%`}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--score-canopy))' }} />
            <span>Strong</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--score-growth))' }} />
            <span>Known</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--score-seedling))' }} />
            <span>Human</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
