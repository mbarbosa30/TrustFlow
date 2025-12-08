import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Activity, Gauge } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface IterationData {
  iteration: number;
  flowChange: number;
  redundancyChange: number;
  totalChange: number;
  converged: boolean;
}

interface ConvergenceSensitivityData {
  iterations: IterationData[];
  componentBreakdown: {
    flowDominant: number;
    redundancyDominant: number;
    balanced: number;
  };
  stabilityScore: number;
}

export function ConvergenceSensitivityChart() {
  const { data, isLoading } = useQuery<ConvergenceSensitivityData>({
    queryKey: ['/api/analytics/localhealth/convergence-sensitivity'],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-convergence-sensitivity-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Convergence Sensitivity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" data-testid="skeleton-convergence-sensitivity" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.iterations.length === 0) {
    return (
      <Card data-testid="card-convergence-sensitivity-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Convergence Sensitivity
          </CardTitle>
          <CardDescription>Component contribution per iteration</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center text-muted-foreground" data-testid="text-convergence-sensitivity-empty">
          No convergence data available
        </CardContent>
      </Card>
    );
  }

  const totalIterations = data.componentBreakdown.flowDominant + 
    data.componentBreakdown.redundancyDominant + 
    data.componentBreakdown.balanced;

  const getDominantComponent = () => {
    if (data.componentBreakdown.flowDominant > data.componentBreakdown.redundancyDominant) {
      return 'Flow-driven';
    } else if (data.componentBreakdown.redundancyDominant > data.componentBreakdown.flowDominant) {
      return 'Redundancy-driven';
    }
    return 'Balanced';
  };

  return (
    <Card data-testid="card-convergence-sensitivity">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Convergence Sensitivity
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" data-testid="badge-dominant-component">{getDominantComponent()}</Badge>
            <Badge variant={data.stabilityScore > 80 ? "default" : data.stabilityScore > 50 ? "secondary" : "destructive"} data-testid="badge-stability-score">
              {data.stabilityScore}% stable
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Per-iteration breakdown showing which component (flow vs redundancy) drives score changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 py-4" data-testid="chart-convergence-sensitivity">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.iterations} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                  name === 'flowChange' ? 'Flow Δ' : name === 'redundancyChange' ? 'Redundancy Δ' : 'Total Δ'
                ]}
              />
              <Legend />
              <Bar 
                dataKey="flowChange" 
                name="Flow Change"
                stackId="a"
                fill="hsl(var(--primary))"
              />
              <Bar 
                dataKey="redundancyChange" 
                name="Redundancy Change"
                stackId="a"
                fill="hsl(var(--accent-foreground))"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Component Dominance</span>
          </div>
          
          <div className="space-y-3" data-testid="component-dominance-breakdown">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Flow-driven iterations</span>
                <span data-testid="text-flow-dominant">{data.componentBreakdown.flowDominant} / {totalIterations}</span>
              </div>
              <Progress 
                value={totalIterations > 0 ? (data.componentBreakdown.flowDominant / totalIterations) * 100 : 0} 
                className="h-2" 
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Redundancy-driven iterations</span>
                <span data-testid="text-redundancy-dominant">{data.componentBreakdown.redundancyDominant} / {totalIterations}</span>
              </div>
              <Progress 
                value={totalIterations > 0 ? (data.componentBreakdown.redundancyDominant / totalIterations) * 100 : 0} 
                className="h-2" 
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Balanced iterations</span>
                <span data-testid="text-balanced-iterations">{data.componentBreakdown.balanced} / {totalIterations}</span>
              </div>
              <Progress 
                value={totalIterations > 0 ? (data.componentBreakdown.balanced / totalIterations) * 100 : 0} 
                className="h-2" 
              />
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground" data-testid="text-stability-explanation">
            <strong>Stability Score:</strong> {data.stabilityScore}% — measures how smoothly the algorithm converges. 
            Higher scores indicate predictable behavior; lower scores may indicate oscillation or sensitivity to small changes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
