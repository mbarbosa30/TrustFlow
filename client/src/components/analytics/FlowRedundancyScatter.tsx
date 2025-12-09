import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ZAxis, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { GitBranch, TrendingUp } from "lucide-react";

interface CorrelationPoint {
  address: string;
  localHealth: number;
  vouchCount: number;
  outgoingVouches: number;
  flowComponent: number;
  redundancyComponent: number;
  estimatedRedundancy: number;
}

interface CorrelationData {
  points: CorrelationPoint[];
  regression: {
    slope: number;
    intercept: number;
    r2: number;
  };
  stats: {
    avgFlow: number;
    avgRedundancy: number;
    correlation: number;
  };
}

export function FlowRedundancyScatter() {
  const { data, isLoading } = useQuery<CorrelationData>({
    queryKey: ['/api/analytics/flow-redundancy-correlation'],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-flow-redundancy-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Flow vs Redundancy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.points.length === 0) {
    return (
      <Card data-testid="card-flow-redundancy-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Flow vs Redundancy
          </CardTitle>
          <CardDescription>Score component correlation analysis</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center text-muted-foreground">
          No user data available for analysis
        </CardContent>
      </Card>
    );
  }

  const getColor = (localHealth: number) => {
    if (localHealth >= 60) return 'hsl(var(--score-canopy))';
    if (localHealth >= 30) return 'hsl(var(--accent-foreground))';
    return 'hsl(var(--muted-foreground))';
  };

  return (
    <Card data-testid="card-flow-redundancy">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" style={{ color: 'hsl(var(--score-growth))' }} />
            Component Correlation
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">R² = {data.regression.r2.toFixed(3)}</Badge>
            <Badge variant={data.stats.correlation > 0.5 ? "default" : "secondary"}>
              r = {data.stats.correlation.toFixed(3)}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Flow (60%) vs Redundancy (40%) components - each dot is a user
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                type="number"
                dataKey="flowComponent" 
                name="Flow Component"
                domain={[0, 60]}
                className="text-xs fill-muted-foreground"
                label={{ value: 'Flow Component (0-60)', position: 'bottom', offset: -5 }}
              />
              <YAxis 
                type="number"
                dataKey="redundancyComponent" 
                name="Redundancy Component"
                domain={[0, 40]}
                className="text-xs fill-muted-foreground"
                label={{ value: 'Redundancy (0-40)', angle: -90, position: 'insideLeft' }}
              />
              <ZAxis type="number" dataKey="vouchCount" range={[50, 400]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => [value.toFixed(1), name]}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    const item = payload[0].payload as CorrelationPoint;
                    return `${item.address} (LocalHealth: ${item.localHealth})`;
                  }
                  return '';
                }}
              />
              <ReferenceLine 
                segment={[
                  { x: 0, y: data.regression.intercept },
                  { x: 60, y: data.regression.slope * 60 + data.regression.intercept }
                ]}
                stroke="hsl(var(--destructive))"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
              <Scatter 
                name="Users" 
                data={data.points}
              >
                {data.points.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColor(entry.localHealth)}
                    fillOpacity={0.7}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t text-center">
          <div>
            <div className="text-lg font-bold">{data.points.length}</div>
            <div className="text-xs text-muted-foreground">Users</div>
          </div>
          <div>
            <div className="text-lg font-bold">{data.stats.avgFlow.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Avg Flow</div>
          </div>
          <div>
            <div className="text-lg font-bold">{data.stats.avgRedundancy.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Avg Redundancy</div>
          </div>
          <div>
            <div className="text-lg font-bold">{data.regression.r2.toFixed(3)}</div>
            <div className="text-xs text-muted-foreground">R² Fit</div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground italic mt-2 text-center">
          Dot size = vouch count. Color = LocalHealth tier (green {'>'} 60, yellow {'>'} 30, gray {'<'} 30)
        </p>
      </CardContent>
    </Card>
  );
}
