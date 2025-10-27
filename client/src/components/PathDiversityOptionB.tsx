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

interface PathDiversityOptionBProps {
  data: EpochDiversity[];
}

export function PathDiversityOptionB({ data }: PathDiversityOptionBProps) {
  if (!data || data.length === 0) {
    return (
      <Card data-testid="card-path-diversity-b">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Option B: Evolution Trend
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            No data available
          </p>
        </CardHeader>
      </Card>
    );
  }

  const recentData = data.length >= 6 ? data.slice(-6) : data;
  const isSingleEpoch = recentData.length === 1;
  
  const firstMedian = recentData[0].median;
  const lastMedian = recentData[recentData.length - 1].median;
  const overallMin = Math.min(...recentData.map(d => d.min));
  const overallMax = Math.max(...recentData.map(d => d.max));
  
  const change = isSingleEpoch ? 0 : ((lastMedian - firstMedian) * 100).toFixed(1);
  const changeNum = parseFloat(String(change));
  
  const getTrendIcon = () => {
    if (changeNum === 0 || isSingleEpoch) {
      return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
    return changeNum > 0 
      ? <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
      : <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />;
  };
  
  const getTrendColor = () => {
    if (changeNum === 0 || isSingleEpoch) return "text-muted-foreground";
    return changeNum > 0 
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";
  };

  return (
    <Card data-testid="card-path-diversity-b">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Option B: Evolution Trend
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Median progression with min/max envelope over {recentData.length} epochs
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-muted-foreground font-mono">
            <span>{recentData[0].epoch}</span>
            {!isSingleEpoch && (
              <div className="flex items-center gap-1">
                {getTrendIcon()}
                <span className={getTrendColor()}>
                  {changeNum > 0 ? '+' : ''}{change}%
                </span>
              </div>
            )}
            {!isSingleEpoch && <span>{recentData[recentData.length - 1].epoch}</span>}
          </div>
          
          <div className="relative h-32" style={{ padding: '4px 0' }}>
            {isSingleEpoch ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold text-primary">
                    {(firstMedian * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Single epoch
                  </div>
                </div>
              </div>
            ) : (
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="envelopeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="hsl(var(--muted))" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                
                <polygon
                  points={recentData.map((d, i) => {
                    const x = (i / (recentData.length - 1)) * 100;
                    const yMin = (1 - d.min) * 100;
                    return `${x},${yMin}`;
                  }).join(' ') + ' ' + 
                  recentData.map((d, i) => {
                    const x = ((recentData.length - 1 - i) / (recentData.length - 1)) * 100;
                    const yMax = (1 - d.max) * 100;
                    return `${x},${yMax}`;
                  }).join(' ')}
                  fill="url(#envelopeGradient)"
                  stroke="none"
                />
                
                <polyline
                  points={recentData.map((d, i) => {
                    const x = (i / (recentData.length - 1)) * 100;
                    const y = (1 - d.median) * 100;
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                
                {recentData.map((d, i) => {
                  const x = (i / (recentData.length - 1)) * 100;
                  const y = (1 - d.median) * 100;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="0.8"
                      fill="hsl(var(--primary))"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>
            )}
          </div>
          
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              Range: {(overallMin * 100).toFixed(0)}%
            </span>
            <span className="font-medium">
              Latest: {(lastMedian * 100).toFixed(0)}%
            </span>
            <span className="text-muted-foreground">
              {(overallMax * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          <p>Line shows median diversity evolution across epochs. Shaded area shows min/max envelope.</p>
        </div>
      </CardContent>
    </Card>
  );
}
