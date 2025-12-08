import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, ComposedChart, Scatter, Area } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Zap } from "lucide-react";

interface EmpiricalPoint {
  vouchCount: number;
  avgLocalHealth: number;
  userCount: number;
  theoreticalFlow: number;
}

interface TheoreticalPoint {
  vouchCount: number;
  flowComponent: number;
  saturationPercentage: number;
}

interface FlowSaturationData {
  empiricalCurve: EmpiricalPoint[];
  theoreticalCurve: TheoreticalPoint[];
  healthyTarget: number;
  maxFlowComponent: number;
}

export function FlowSaturationCurve() {
  const { data, isLoading } = useQuery<FlowSaturationData>({
    queryKey: ['/api/analytics/flow-saturation-curve'],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-flow-saturation-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Flow Saturation Curve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card data-testid="card-flow-saturation-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Flow Saturation Curve
          </CardTitle>
          <CardDescription>Vouch count vs LocalHealth relationship</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-flow-saturation">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Flow Saturation Curve
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Target: {data.healthyTarget} vouches</Badge>
            <Badge variant="secondary">Max: {data.maxFlowComponent} pts</Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Quadratic scaling: Flow = 60 × (vouches / {data.healthyTarget})² — diminishing returns after saturation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTheoretical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                type="number"
                dataKey="vouchCount" 
                domain={[0, 15]}
                className="text-xs fill-muted-foreground"
                label={{ value: 'Vouch Count', position: 'bottom', offset: -5 }}
              />
              <YAxis 
                domain={[0, 100]}
                className="text-xs fill-muted-foreground"
                label={{ value: 'Score / Component', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <ReferenceLine 
                x={data.healthyTarget} 
                stroke="hsl(var(--destructive))" 
                strokeDasharray="5 5"
                label={{ value: 'Saturation', position: 'top', fill: 'hsl(var(--destructive))' }}
              />
              <Area 
                data={data.theoreticalCurve}
                type="monotone" 
                dataKey="flowComponent" 
                name="Theoretical Flow"
                stroke="hsl(var(--primary))" 
                fill="url(#colorTheoretical)"
                strokeWidth={2}
              />
              <Scatter 
                data={data.empiricalCurve}
                dataKey="avgLocalHealth"
                name="Empirical Avg"
                fill="hsl(var(--accent-foreground))"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Algorithm Formula</span>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs">
            <div className="text-muted-foreground mb-1">// Flow Component (60% of total score)</div>
            <div>flowScore = min(1.0, vouchCount / {data.healthyTarget})</div>
            <div>flowComponent = 60 × flowScore<sup>2.0</sup></div>
            <div className="text-muted-foreground mt-2">// Quadratic scaling creates diminishing returns</div>
            <div className="grid grid-cols-4 gap-2 mt-2 text-center">
              <div>1 vouch → 0.9 pts</div>
              <div>4 vouches → 15 pts</div>
              <div>8 vouches → 60 pts</div>
              <div>16 vouches → 60 pts</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
