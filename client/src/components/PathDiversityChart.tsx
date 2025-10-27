import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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
  const latest = data[data.length - 1];
  const previous = data.length > 1 ? data[data.length - 2] : null;
  
  const latestMedian = (latest.median * 100).toFixed(0);
  const trend = previous 
    ? ((latest.median - previous.median) * 100).toFixed(1)
    : null;
  
  const getTrendIcon = () => {
    if (!trend || parseFloat(trend) === 0) {
      return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
    return parseFloat(trend) > 0 
      ? <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
      : <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />;
  };
  
  const getTrendColor = () => {
    if (!trend || parseFloat(trend) === 0) return "text-muted-foreground";
    return parseFloat(trend) > 0 
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";
  };

  return (
    <Card data-testid="card-path-diversity">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Path Diversity Index
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-3xl font-bold" data-testid="text-diversity-value">
            {latestMedian}%
          </div>
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            {trend && (
              <span className={`text-sm font-medium ${getTrendColor()}`} data-testid="text-diversity-trend">
                {parseFloat(trend) > 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Median diversity across network (higher = more collusion-resistant)
        </p>
        <div className="flex justify-between text-xs text-muted-foreground mt-3 pt-3 border-t">
          <span>Range: {(latest.min * 100).toFixed(0)}% - {(latest.max * 100).toFixed(0)}%</span>
          <span className="font-mono">{latest.epoch}</span>
        </div>
      </CardContent>
    </Card>
  );
}
