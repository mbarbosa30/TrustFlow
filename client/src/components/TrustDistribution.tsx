import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TierBadge, type Tier } from "./TierBadge";

interface DistributionData {
  level: Tier;
  count: number;
  percentage: number;
}

interface TrustDistributionProps {
  distribution: DistributionData[];
}

export function TrustDistribution({ distribution }: TrustDistributionProps) {
  return (
    <Card data-testid="card-trust-distribution">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Tier Distribution</CardTitle>
        <p className="text-sm text-muted-foreground">
          Network breakdown by achievement tier
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {distribution.map((item) => (
          <div key={item.level} className="space-y-2">
            <div className="flex items-center justify-between">
              <TierBadge tier={item.level} />
              <div className="text-right">
                <div className="text-sm font-semibold">{item.count.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{item.percentage}%</div>
              </div>
            </div>
            <Progress value={item.percentage} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
