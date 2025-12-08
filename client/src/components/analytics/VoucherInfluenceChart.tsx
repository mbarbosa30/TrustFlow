import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Crown, TrendingDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Influencer {
  address: string;
  fullAddress: string;
  vouchCount: number;
  localHealth: number;
  influenceShare: number;
  beneficiaryCount: number;
}

interface InfluenceData {
  influencers: Influencer[];
  giniCoefficient: number;
  concentrationMetrics: {
    top5Share: number;
    top10Share: number;
    top20Share: number;
  };
}

export function VoucherInfluenceChart() {
  const { data, isLoading } = useQuery<InfluenceData>({
    queryKey: ['/api/analytics/localhealth/voucher-influence'],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-voucher-influence-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Voucher Influence Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" data-testid="skeleton-voucher-influence" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.influencers.length === 0) {
    return (
      <Card data-testid="card-voucher-influence-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Voucher Influence Distribution
          </CardTitle>
          <CardDescription>Trust concentration from top endorsers</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center text-muted-foreground" data-testid="text-voucher-influence-empty">
          No influence data available
        </CardContent>
      </Card>
    );
  }

  const sortedInfluencers = [...data.influencers].sort((a, b) => a.influenceShare - b.influenceShare);
  
  let cumulativeShare = 0;
  const lorenzData = sortedInfluencers.map((inf, index) => {
    cumulativeShare += inf.influenceShare;
    return {
      percentile: Math.round(((index + 1) / sortedInfluencers.length) * 100),
      cumulativeInfluence: Math.min(100, cumulativeShare),
      equalityLine: Math.round(((index + 1) / sortedInfluencers.length) * 100)
    };
  });

  const concentrationLevel = data.giniCoefficient > 0.5 
    ? 'High Concentration' 
    : data.giniCoefficient > 0.3 
      ? 'Moderate' 
      : 'Well Distributed';

  return (
    <Card data-testid="card-voucher-influence">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Voucher Influence
          </span>
          <div className="flex items-center gap-2">
            <Badge variant={data.giniCoefficient > 0.5 ? "destructive" : data.giniCoefficient > 0.3 ? "secondary" : "default"} data-testid="badge-gini-coefficient">
              Gini: {data.giniCoefficient.toFixed(3)}
            </Badge>
            <Badge variant="outline" data-testid="badge-concentration-level">{concentrationLevel}</Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Lorenz curve showing trust concentration — further from diagonal = more inequality
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64" data-testid="chart-lorenz-curve">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={lorenzData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorInfluence" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="percentile" 
                className="text-xs fill-muted-foreground"
                label={{ value: 'Population %', position: 'bottom', offset: -5 }}
              />
              <YAxis 
                domain={[0, 100]}
                className="text-xs fill-muted-foreground"
                label={{ value: 'Influence %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}%`,
                  name === 'cumulativeInfluence' ? 'Cumulative Influence' : 'Perfect Equality'
                ]}
              />
              <Area 
                type="monotone" 
                dataKey="equalityLine" 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                fill="none"
                name="Perfect Equality"
              />
              <Area 
                type="monotone" 
                dataKey="cumulativeInfluence" 
                stroke="hsl(var(--primary))" 
                fill="url(#colorInfluence)"
                name="Actual Distribution"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t text-center">
          <div>
            <div className="text-lg font-bold" data-testid="text-top5-share">{data.concentrationMetrics.top5Share}%</div>
            <div className="text-xs text-muted-foreground">Top 5 Share</div>
          </div>
          <div>
            <div className="text-lg font-bold" data-testid="text-top10-share">{data.concentrationMetrics.top10Share}%</div>
            <div className="text-xs text-muted-foreground">Top 10 Share</div>
          </div>
          <div>
            <div className="text-lg font-bold" data-testid="text-top20-share">{data.concentrationMetrics.top20Share}%</div>
            <div className="text-xs text-muted-foreground">Top 20 Share</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Top Influencers</span>
          </div>
          <ScrollArea className="h-32" data-testid="list-top-influencers">
            <div className="space-y-2">
              {data.influencers.slice(0, 10).map((inf, i) => (
                <div key={i} className="flex justify-between items-center text-sm" data-testid={`row-influencer-${i}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4">{i + 1}.</span>
                    <span className="font-mono text-xs">{inf.address}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs" data-testid={`badge-influencer-health-${i}`}>LH: {inf.localHealth}</Badge>
                    <span className="font-medium" data-testid={`text-influencer-share-${i}`}>{inf.influenceShare}%</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
