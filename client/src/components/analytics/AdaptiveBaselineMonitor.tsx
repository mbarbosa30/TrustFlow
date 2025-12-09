import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Gauge, TrendingUp, Settings } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AdaptiveBaselineData {
  adaptive: {
    healthyVouchCount: number;
    healthyRedundancy: number;
    source: string;
    networkTooSmall: boolean;
  };
  fixed: {
    healthyVouchCount: number;
    healthyRedundancy: number;
  };
  networkStats: {
    totalUsers: number;
    totalVouches: number;
    avgVouchCount: number;
    medianVouchCount: number;
    p75VouchCount: number;
  };
  adaptiveEnabled: boolean;
}

export function AdaptiveBaselineMonitor() {
  const { data, isLoading, error } = useQuery<AdaptiveBaselineData>({
    queryKey: ['/api/analytics/localhealth/adaptive-baselines'],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-adaptive-baselines-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            Adaptive Baseline Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card data-testid="card-adaptive-baselines-error">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            Adaptive Baseline Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground">Failed to load baseline data</p>
        </CardContent>
      </Card>
    );
  }

  const vouchDiff = data.adaptive.healthyVouchCount - data.fixed.healthyVouchCount;
  const redundancyDiff = data.adaptive.healthyRedundancy - data.fixed.healthyRedundancy;

  return (
    <Card data-testid="card-adaptive-baselines">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="w-5 h-5" />
          Adaptive Baseline Monitor
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          Dynamic "healthy" thresholds computed from network percentiles
          <Badge variant={data.adaptiveEnabled ? "default" : "secondary"}>
            {data.adaptiveEnabled ? "Adaptive ON" : "Fixed Mode"}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="py-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Healthy Vouch Count</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" data-testid="text-adaptive-vouch">
                  {data.adaptive.healthyVouchCount.toFixed(1)}
                </Badge>
                {vouchDiff !== 0 && (
                  <span className="text-xs" style={{ color: vouchDiff > 0 ? 'hsl(var(--score-growth))' : 'hsl(var(--destructive))' }}>
                    ({vouchDiff > 0 ? '+' : ''}{vouchDiff.toFixed(1)} vs fixed)
                  </span>
                )}
              </div>
            </div>
            <Progress 
              value={(data.adaptive.healthyVouchCount / 15) * 100} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Min: 4</span>
              <span>Fixed: {data.fixed.healthyVouchCount}</span>
              <span>Max: 15</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Healthy Redundancy</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" data-testid="text-adaptive-redundancy">
                  {data.adaptive.healthyRedundancy.toFixed(1)}
                </Badge>
                {redundancyDiff !== 0 && (
                  <span className="text-xs" style={{ color: redundancyDiff > 0 ? 'hsl(var(--score-growth))' : 'hsl(var(--destructive))' }}>
                    ({redundancyDiff > 0 ? '+' : ''}{redundancyDiff.toFixed(1)} vs fixed)
                  </span>
                )}
              </div>
            </div>
            <Progress 
              value={(data.adaptive.healthyRedundancy / 60) * 100} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Min: 15</span>
              <span>Fixed: {data.fixed.healthyRedundancy}</span>
              <span>Max: 60</span>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" style={{ color: 'hsl(var(--score-growth))' }} />
            <span className="text-sm font-medium">Network Statistics</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            <div>
              <div className="text-lg font-bold" data-testid="text-network-users">
                {data.networkStats.totalUsers}
              </div>
              <div className="text-xs text-muted-foreground">Users</div>
            </div>
            <div>
              <div className="text-lg font-bold" data-testid="text-network-vouches">
                {data.networkStats.totalVouches}
              </div>
              <div className="text-xs text-muted-foreground">Vouches</div>
            </div>
            <div>
              <div className="text-lg font-bold" data-testid="text-avg-vouch-count">
                {data.networkStats.avgVouchCount}
              </div>
              <div className="text-xs text-muted-foreground">Avg Vouches</div>
            </div>
            <div>
              <div className="text-lg font-bold" data-testid="text-median-vouch-count">
                {data.networkStats.medianVouchCount}
              </div>
              <div className="text-xs text-muted-foreground">Median</div>
            </div>
            <div className="rounded p-1" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)' }}>
              <div className="text-lg font-bold" style={{ color: 'hsl(var(--score-growth))' }} data-testid="text-p75-vouch-count">
                {data.networkStats.p75VouchCount}
              </div>
              <div className="text-xs text-muted-foreground">75th Percentile</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Source:</span>
          <Badge variant="secondary">{data.adaptive.source}</Badge>
          {data.adaptive.networkTooSmall && (
            <span className="text-xs text-amber-600">(Network &lt; 10 users)</span>
          )}
        </div>

        <p className="text-xs text-muted-foreground italic text-center">
          Like rivers adapting to terrain — baselines shift as the network grows, ensuring fair scoring at any scale.
        </p>
      </CardContent>
    </Card>
  );
}
