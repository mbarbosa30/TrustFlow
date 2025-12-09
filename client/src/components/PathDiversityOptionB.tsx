import { useState } from "react";
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
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

  const recentData = data;
  const isSingleEpoch = recentData.length === 1;
  
  const firstMedian = recentData[0].median;
  const lastMedian = recentData[recentData.length - 1].median;
  const overallMin = Math.min(...recentData.map(d => d.min));
  const overallMax = Math.max(...recentData.map(d => d.max));
  
  const padding = (overallMax - overallMin) * 0.2;
  const yMin = Math.max(0, overallMin - padding);
  const yMax = Math.min(1, overallMax + padding);
  const yRange = yMax - yMin;
  
  const change = isSingleEpoch ? 0 : ((lastMedian - firstMedian) * 100).toFixed(1);
  const changeNum = parseFloat(String(change));
  
  const getTrendIcon = () => {
    if (changeNum === 0 || isSingleEpoch) {
      return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
    return changeNum > 0 
      ? <TrendingUp className="w-4 h-4" style={{ color: 'hsl(var(--score-growth))' }} />
      : <TrendingDown className="w-4 h-4" style={{ color: 'hsl(var(--destructive))' }} />;
  };
  
  const getTrendColor = (): React.CSSProperties => {
    if (changeNum === 0 || isSingleEpoch) return { color: 'hsl(var(--muted-foreground))' };
    return changeNum > 0 
      ? { color: 'hsl(var(--score-growth))' }
      : { color: 'hsl(var(--destructive))' };
  };

  return (
    <Card data-testid="card-path-diversity-b">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Path Diversity Index
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Share of flow from disjoint regions (higher = more collusion-resistant)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-muted-foreground font-mono">
            <span>{recentData[0].epoch}</span>
            {!isSingleEpoch && (
              <div className="flex items-center gap-1">
                {getTrendIcon()}
                <span style={getTrendColor()}>
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
              <svg 
                width="100%" 
                height="100%" 
                viewBox="0 0 100 100" 
                preserveAspectRatio="none"
                onMouseLeave={() => setHoveredIndex(null)}
              >
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
                    const yMinScaled = ((yMax - d.min) / yRange) * 100;
                    return `${x},${yMinScaled}`;
                  }).join(' ') + ' ' + 
                  recentData.map((d, i) => {
                    const x = ((recentData.length - 1 - i) / (recentData.length - 1)) * 100;
                    const yMaxScaled = ((yMax - d.max) / yRange) * 100;
                    return `${x},${yMaxScaled}`;
                  }).join(' ')}
                  fill="url(#envelopeGradient)"
                  stroke="none"
                />
                
                <polyline
                  points={recentData.map((d, i) => {
                    const x = (i / (recentData.length - 1)) * 100;
                    const yMedianScaled = ((yMax - d.median) / yRange) * 100;
                    return `${x},${yMedianScaled}`;
                  }).join(' ')}
                  fill="none"
                  stroke="hsl(var(--score-dormant))"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                
                {recentData.map((d, i) => {
                  const segmentWidth = 100 / recentData.length;
                  const x = segmentWidth * i;
                  
                  return (
                    <rect
                      key={i}
                      x={x}
                      y={0}
                      width={segmentWidth}
                      height={100}
                      fill="transparent"
                      onMouseEnter={() => setHoveredIndex(i)}
                      style={{ cursor: 'pointer' }}
                      data-testid={`hover-zone-${i}`}
                    />
                  );
                })}
              </svg>
            )}
            
            {hoveredIndex !== null && !isSingleEpoch && (
              <div 
                className="absolute bg-popover border border-border rounded-md shadow-lg p-2 text-xs z-10 pointer-events-none"
                style={{
                  left: `${((hoveredIndex + 0.5) / recentData.length) * 100}%`,
                  top: '-60px',
                  transform: 'translateX(-50%)'
                }}
                data-testid="tooltip-diversity"
              >
                <div className="font-mono font-semibold mb-1">{recentData[hoveredIndex].epoch}</div>
                <div className="space-y-0.5">
                  <div>Median: <span className="font-medium">{(recentData[hoveredIndex].median * 100).toFixed(1)}%</span></div>
                  <div className="text-muted-foreground">
                    Range: {(recentData[hoveredIndex].min * 100).toFixed(0)}% - {(recentData[hoveredIndex].max * 100).toFixed(0)}%
                  </div>
                  <div className="text-muted-foreground">
                    IQR: {(recentData[hoveredIndex].p25 * 100).toFixed(0)}% - {(recentData[hoveredIndex].p75 * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
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
