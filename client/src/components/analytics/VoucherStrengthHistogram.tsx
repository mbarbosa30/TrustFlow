import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Users, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HistogramBucket {
  range: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

interface DilutionEntry {
  address: string;
  vouchesGiven: number;
  localHealth: number;
  dilutionPenalty: number;
}

interface VoucherStrengthData {
  histogram: HistogramBucket[];
  stats: {
    mean: number;
    median: number;
    stdDev: number;
    skewness: number;
  };
  dilutionAnalysis: DilutionEntry[];
}

export function VoucherStrengthHistogram() {
  const { data, isLoading } = useQuery<VoucherStrengthData>({
    queryKey: ['/api/analytics/voucher-strength-distribution'],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-voucher-strength-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Voucher Strength Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.histogram.length === 0) {
    return (
      <Card data-testid="card-voucher-strength-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Voucher Strength Distribution
          </CardTitle>
          <CardDescription>LocalHealth of users giving vouches</CardDescription>
        </CardHeader>
        <CardContent className="h-72 flex items-center justify-center text-muted-foreground">
          No vouch data available
        </CardContent>
      </Card>
    );
  }

  const getBarColor = (bucket: HistogramBucket) => {
    if (bucket.min >= 60) return 'hsl(var(--primary))';
    if (bucket.min >= 30) return 'hsl(var(--accent-foreground))';
    return 'hsl(var(--muted-foreground))';
  };

  const skewnessInterpretation = data.stats.skewness > 0.5 
    ? 'Right-skewed (many low-strength vouchers)' 
    : data.stats.skewness < -0.5 
      ? 'Left-skewed (many high-strength vouchers)'
      : 'Approximately symmetric';

  return (
    <Card data-testid="card-voucher-strength">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Voucher Strength
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">μ = {data.stats.mean.toFixed(1)}</Badge>
            <Badge variant="secondary">σ = {data.stats.stdDev.toFixed(1)}</Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Distribution of LocalHealth scores among vouchers (endorsers)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.histogram} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="range" 
                className="text-xs fill-muted-foreground"
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value} vouches (${props.payload.percentage}%)`,
                  'Count'
                ]}
              />
              <ReferenceLine 
                x={`${Math.floor(data.stats.mean / 10) * 10}-${Math.floor(data.stats.mean / 10) * 10 + 10}`}
                stroke="hsl(var(--destructive))" 
                strokeDasharray="5 5"
                label={{ value: 'Mean', position: 'top', fill: 'hsl(var(--destructive))' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.histogram.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t text-center">
          <div>
            <div className="text-lg font-bold">{data.stats.mean.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Mean</div>
          </div>
          <div>
            <div className="text-lg font-bold">{data.stats.median.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Median</div>
          </div>
          <div>
            <div className="text-lg font-bold">{data.stats.stdDev.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Std Dev</div>
          </div>
          <div>
            <div className="text-lg font-bold">{data.stats.skewness.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Skewness</div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground italic mt-2 text-center">
          {skewnessInterpretation}
        </p>

        {data.dilutionAnalysis.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm font-medium">Dilution Analysis (Top Vouchers)</span>
            </div>
            <ScrollArea className="h-24">
              <div className="space-y-1">
                {data.dilutionAnalysis.slice(0, 5).map((entry, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="font-mono">{entry.address}</span>
                    <div className="flex items-center gap-2">
                      <span>{entry.vouchesGiven} vouches</span>
                      {entry.dilutionPenalty > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          -{(entry.dilutionPenalty * 100).toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
