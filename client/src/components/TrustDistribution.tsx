import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrustLevelBadge, type TrustLevel } from "./TrustLevelBadge";

interface DistributionData {
  level: TrustLevel;
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
        <CardTitle className="text-lg font-semibold">Trust Level Distribution</CardTitle>
        <p className="text-sm text-muted-foreground">
          Network breakdown by trust level
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {distribution.map((item) => (
          <div key={item.level} className="space-y-2">
            <div className="flex items-center justify-between">
              <TrustLevelBadge level={item.level} />
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
