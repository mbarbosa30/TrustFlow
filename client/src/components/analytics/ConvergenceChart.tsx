import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle, XCircle } from "lucide-react";

interface ConvergenceData {
  iterations: number;
  converged: boolean;
  convergenceThreshold: number;
  residualDecay: { iteration: number; maxChange: number; avgChange: number }[];
  finalMaxChange: number;
  userCount: number;
  vouchCount: number;
}

export function ConvergenceChart() {
  const { data, isLoading } = useQuery<ConvergenceData>({
    queryKey: ['/api/analytics/convergence-metrics'],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-convergence-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Convergence Telemetry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.residualDecay.length === 0) {
    return (
      <Card data-testid="card-convergence-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Convergence Telemetry
          </CardTitle>
          <CardDescription>No convergence data available</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center text-muted-foreground">
          Run network recalculation to generate data
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-convergence">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="w-5 h-5" style={{ color: 'hsl(var(--score-growth))' }} />
            Iterative Convergence
          </span>
          <div className="flex items-center gap-2">
            {data.converged ? (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Converged
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                Not Converged
              </Badge>
            )}
            <Badge variant="outline">{data.iterations} iterations</Badge>
          </div>
        </CardTitle>
        <CardDescription>
          PageRank-style recursive computation tracking max score change per iteration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.residualDecay} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMaxChange" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--score-growth))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--score-growth))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="iteration" 
                className="text-xs fill-muted-foreground"
                label={{ value: 'Iteration', position: 'bottom', offset: -5 }}
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                label={{ value: 'Score Change', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => [
                  value.toFixed(3),
                  name === 'maxChange' ? 'Max Change' : 'Avg Change'
                ]}
              />
              <ReferenceLine 
                y={data.convergenceThreshold} 
                stroke="hsl(var(--destructive))" 
                strokeDasharray="5 5"
                label={{ value: `Threshold: ${data.convergenceThreshold}`, position: 'right', fill: 'hsl(var(--destructive))' }}
              />
              <Area 
                type="monotone" 
                dataKey="maxChange" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1}
                fill="url(#colorMaxChange)"
              />
              <Line 
                type="monotone" 
                dataKey="avgChange" 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t text-center">
          <div>
            <div className="text-lg font-bold">{data.userCount}</div>
            <div className="text-xs text-muted-foreground">Users</div>
          </div>
          <div>
            <div className="text-lg font-bold">{data.vouchCount}</div>
            <div className="text-xs text-muted-foreground">Vouches</div>
          </div>
          <div>
            <div className="text-lg font-bold">{data.iterations}</div>
            <div className="text-xs text-muted-foreground">Iterations</div>
          </div>
          <div>
            <div className="text-lg font-bold">{data.finalMaxChange.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Final Δ</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
