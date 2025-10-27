import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface StabilityMeterProps {
  maxImpact: number;
  contributionBreakdown: { region: string; percentage: number }[];
}

export function StabilityMeter({ maxImpact, contributionBreakdown }: StabilityMeterProps) {
  const stabilityScore = Math.max(0, 100 - maxImpact * 100);

  return (
    <Card data-testid="card-stability">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Stability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm text-muted-foreground">Resilience Score</span>
            <span className="text-2xl font-bold" data-testid="text-stability-score">
              {stabilityScore.toFixed(0)}%
            </span>
          </div>
          <Progress value={stabilityScore} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Removing any single neighbor would drop your score by ≤{(maxImpact * 100).toFixed(0)}%
          </p>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Flow Distribution</h4>
          <div className="space-y-2">
            {contributionBreakdown.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{item.region}</span>
                    <span className="font-medium">{item.percentage}%</span>
                  </div>
                  <Progress value={item.percentage} className="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
