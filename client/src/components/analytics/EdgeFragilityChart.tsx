import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Link2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CriticalEdge {
  endorser: string;
  endorsee: string;
  endorserHealth: number;
  endorseeHealth: number;
  endorseeVouchCount: number;
  impactScore: number;
  riskLevel: 'high' | 'medium' | 'low';
}

interface EdgeFragilityData {
  criticalEdges: CriticalEdge[];
  fragilitySummary: {
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
  };
}

export function EdgeFragilityChart() {
  const { data, isLoading } = useQuery<EdgeFragilityData>({
    queryKey: ['/api/analytics/localhealth/edge-fragility'],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-edge-fragility-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Edge Fragility Analyzer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" data-testid="skeleton-edge-fragility" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.criticalEdges.length === 0) {
    return (
      <Card data-testid="card-edge-fragility-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Edge Fragility Analyzer
          </CardTitle>
          <CardDescription>Critical connection points</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center text-muted-foreground" data-testid="text-edge-fragility-empty">
          No edge data available
        </CardContent>
      </Card>
    );
  }

  const chartData = data.criticalEdges.slice(0, 10).map((edge, index) => ({
    ...edge,
    label: `${edge.endorser} → ${edge.endorsee}`,
    index
  }));

  const getBarColor = (riskLevel: string) => {
    if (riskLevel === 'high') return 'hsl(var(--destructive))';
    if (riskLevel === 'medium') return 'hsl(var(--accent-foreground))';
    return 'hsl(var(--muted-foreground))';
  };

  const totalEdges = data.fragilitySummary.highRisk + data.fragilitySummary.mediumRisk + data.fragilitySummary.lowRisk;

  return (
    <Card data-testid="card-edge-fragility">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Edge Fragility
          </span>
          <div className="flex items-center gap-2">
            {data.fragilitySummary.highRisk > 0 && (
              <Badge variant="destructive" data-testid="badge-high-risk-edges">{data.fragilitySummary.highRisk} High Risk</Badge>
            )}
            <Badge variant="outline" data-testid="badge-total-edges">{totalEdges} edges</Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Critical connections whose removal would significantly impact LocalHealth scores
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 py-4" data-testid="chart-edge-fragility">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ top: 10, right: 30, left: 80, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                type="number"
                className="text-xs fill-muted-foreground"
                label={{ value: 'Impact Score', position: 'bottom', offset: -5 }}
              />
              <YAxis 
                type="category"
                dataKey="label" 
                className="text-xs fill-muted-foreground"
                width={75}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string, props: any) => [
                  `Impact: ${value.toFixed(1)} pts`,
                  `Risk: ${props.payload.riskLevel}`
                ]}
                labelFormatter={(label) => label}
              />
              <Bar 
                dataKey="impactScore" 
                name="Impact"
                radius={[0, 4, 4, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.riskLevel)} data-testid={`bar-edge-${index}`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t text-center">
          <div>
            <div className="text-2xl font-bold text-destructive" data-testid="text-high-risk-count">{data.fragilitySummary.highRisk}</div>
            <div className="text-xs text-muted-foreground">High Risk</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-accent-foreground" data-testid="text-medium-risk-count">{data.fragilitySummary.mediumRisk}</div>
            <div className="text-xs text-muted-foreground">Medium Risk</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-muted-foreground" data-testid="text-low-risk-count">{data.fragilitySummary.lowRisk}</div>
            <div className="text-xs text-muted-foreground">Low Risk</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium">High Risk Edges</span>
          </div>
          <ScrollArea className="h-24" data-testid="list-high-risk-edges">
            <div className="space-y-2">
              {data.criticalEdges.filter(e => e.riskLevel === 'high').slice(0, 5).map((edge, i) => (
                <div key={i} className="flex justify-between items-center text-xs" data-testid={`row-high-risk-edge-${i}`}>
                  <span className="font-mono">{edge.endorser} → {edge.endorsee}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{edge.endorseeVouchCount} vouches</span>
                    <Badge variant="destructive" data-testid={`badge-edge-impact-${i}`}>-{edge.impactScore.toFixed(1)} pts</Badge>
                  </div>
                </div>
              ))}
              {data.criticalEdges.filter(e => e.riskLevel === 'high').length === 0 && (
                <p className="text-xs text-muted-foreground" data-testid="text-no-high-risk">No high-risk edges detected</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
