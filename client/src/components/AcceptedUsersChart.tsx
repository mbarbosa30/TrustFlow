import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EpochData {
  epoch: string;
  apprentice: number;
  journeyer: number;
  master: number;
}

interface AcceptedUsersChartProps {
  data: EpochData[];
}

export function AcceptedUsersChart({ data }: AcceptedUsersChartProps) {
  const maxTotal = Math.max(...data.map(d => d.apprentice + d.journeyer + d.master));

  return (
    <Card data-testid="card-accepted-users-chart">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Accepted Users Over Time
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Growth by tier across epochs
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((point, index) => {
            const total = point.apprentice + point.journeyer + point.master;
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-mono">{point.epoch}</span>
                  <span className="font-semibold">{total.toLocaleString()}</span>
                </div>
                <div className="h-8 flex rounded overflow-hidden">
                  <div
                    className="bg-primary flex items-center justify-center text-xs text-primary-foreground font-medium"
                    style={{ width: `${(point.master / maxTotal) * 100}%` }}
                    title={`Master: ${point.master}`}
                  >
                    {point.master > 0 && point.master}
                  </div>
                  <div
                    className="bg-accent flex items-center justify-center text-xs text-accent-foreground font-medium"
                    style={{ width: `${(point.journeyer / maxTotal) * 100}%` }}
                    title={`Journeyer: ${point.journeyer}`}
                  >
                    {point.journeyer > 0 && point.journeyer}
                  </div>
                  <div
                    className="bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium"
                    style={{ width: `${(point.apprentice / maxTotal) * 100}%` }}
                    title={`Apprentice: ${point.apprentice}`}
                  >
                    {point.apprentice > 0 && point.apprentice}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded" />
            <span>Master</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-accent rounded" />
            <span>Journeyer</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-muted rounded" />
            <span>Apprentice</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
