import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TierBadge, type Tier } from "./TierBadge";

interface DistributionData {
  level: Tier;
  count: number;
  percentage: number;
}

interface ScoreDistributionProps {
  distribution: DistributionData[];
  isLoading?: boolean;
}

interface TrustDistributionProps {
  distribution: DistributionData[];
  isLoading?: boolean;
}

export function ScoreDistribution({ distribution, isLoading = false }: ScoreDistributionProps) {
  return (
    <Card data-testid="card-score-distribution">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Score Distribution</CardTitle>
        <p className="text-sm text-muted-foreground">
          Current epoch breakdown by achievement tier
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12" data-testid="loading-tier-distribution">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Loading tier distribution data...</p>
            </div>
          </div>
        ) : distribution.length === 0 ? (
          <div className="flex items-center justify-center py-12" data-testid="text-no-tier-distribution">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No tier distribution data available yet</p>
              <p className="text-xs mt-1">Tiers will appear after users receive network scores</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const TrustDistribution = ScoreDistribution;
