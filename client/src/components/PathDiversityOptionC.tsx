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

interface PathDiversityOptionCProps {
  data: EpochDiversity[];
}

export function PathDiversityOptionC({ data }: PathDiversityOptionCProps) {
  if (!data || data.length === 0) {
    return (
      <Card data-testid="card-path-diversity-c">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Option C: Summary Statistics
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            No data available
          </p>
        </CardHeader>
      </Card>
    );
  }

  const recentData = data.length >= 6 ? data.slice(-6) : data;
  
  const allMedians = recentData.map(d => d.median);
  const avgMedian = allMedians.reduce((a, b) => a + b, 0) / allMedians.length;
  
  const allP25 = recentData.map(d => d.p25);
  const avgP25 = allP25.reduce((a, b) => a + b, 0) / allP25.length;
  
  const allP75 = recentData.map(d => d.p75);
  const avgP75 = allP75.reduce((a, b) => a + b, 0) / allP75.length;
  
  const overallMin = Math.min(...recentData.map(d => d.min));
  const overallMax = Math.max(...recentData.map(d => d.max));
  
  const firstMedian = recentData[0].median;
  const lastMedian = recentData[recentData.length - 1].median;
  const trend = ((lastMedian - firstMedian) * 100).toFixed(1);
  const trendNum = parseFloat(trend);
  
  const getTrendIcon = () => {
    if (trendNum === 0) {
      return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
    return trendNum > 0 
      ? <TrendingUp className="w-4 h-4" style={{ color: 'hsl(var(--score-growth))' }} />
      : <TrendingDown className="w-4 h-4" style={{ color: 'hsl(var(--destructive))' }} />;
  };
  
  const getTrendColor = (): React.CSSProperties => {
    if (trendNum === 0) return { color: 'hsl(var(--muted-foreground))' };
    return trendNum > 0 
      ? { color: 'hsl(var(--score-growth))' }
      : { color: 'hsl(var(--destructive))' };
  };

  return (
    <Card data-testid="card-path-diversity-c">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Option C: Summary Statistics
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Averaged metrics across last {recentData.length} epochs
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-muted-foreground font-mono">
            <span>Epochs {recentData[0].epoch} - {recentData[recentData.length - 1].epoch}</span>
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              <span style={getTrendColor()}>
                {trendNum > 0 ? '+' : ''}{trend}%
              </span>
            </div>
          </div>
          <div className="relative h-12 flex items-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-2 bg-muted rounded" />
              <div
                className="absolute h-2 bg-accent rounded"
                style={{
                  left: `${avgP25 * 100}%`,
                  width: `${(avgP75 - avgP25) * 100}%`,
                }}
              />
              <div
                className="absolute w-1 h-6 bg-primary rounded"
                style={{ left: `${avgMedian * 100}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              Min: {(overallMin * 100).toFixed(0)}%
            </span>
            <span className="font-medium">
              Avg Median: {(avgMedian * 100).toFixed(0)}%
            </span>
            <span className="text-muted-foreground">
              Max: {(overallMax * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          <p>Averaged box plot showing typical diversity distribution with trend indicator.</p>
        </div>
      </CardContent>
    </Card>
  );
}
