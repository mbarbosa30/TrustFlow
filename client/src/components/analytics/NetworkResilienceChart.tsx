import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface PathDistribution {
  paths: string;
  count: number;
}

interface NetworkResilienceData {
  distribution: PathDistribution[];
  avgDisjointPaths: number;
  highlyResilient: number;
  vulnerable: number;
  totalAnalyzed: number;
}

const PATH_COLORS = [
  'hsl(var(--destructive))',     // 0 paths - destructive/red
  'hsl(var(--score-dormant))',   // 1 path - soil brown
  'hsl(var(--score-transition))', // 2 paths - sunlit amber
  'hsl(var(--score-growth))',    // 3 paths - river teal
  'hsl(var(--score-growth))',    // 4 paths - river teal
  'hsl(var(--score-canopy))',    // 5+ paths - forest green
];

export function NetworkResilienceChart() {
  const { data, isLoading, error } = useQuery<NetworkResilienceData>({
    queryKey: ['/api/analytics/localhealth/network-resilience'],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-network-resilience-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Network Resilience
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card data-testid="card-network-resilience-error">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Network Resilience
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">Failed to load resilience data</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.distribution.map((item, index) => ({
    ...item,
    fill: PATH_COLORS[index] || PATH_COLORS[PATH_COLORS.length - 1],
  }));

  const vulnerablePercent = data.totalAnalyzed > 0 
    ? Math.round((data.vulnerable / data.totalAnalyzed) * 100) 
    : 0;
  const resilientPercent = data.totalAnalyzed > 0 
    ? Math.round((data.highlyResilient / data.totalAnalyzed) * 100) 
    : 0;

  return (
    <Card data-testid="card-network-resilience">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Network Resilience (Vertex-Disjoint Paths)
        </CardTitle>
        <CardDescription>
          Distribution of truly independent endorsement paths per user — harder to Sybil attack
        </CardDescription>
      </CardHeader>
      <CardContent className="py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold" data-testid="text-avg-paths">{data.avgDisjointPaths}</div>
            <div className="text-xs text-muted-foreground">Avg Disjoint Paths</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold" data-testid="text-total-analyzed">{data.totalAnalyzed}</div>
            <div className="text-xs text-muted-foreground">Users Analyzed</div>
          </div>
          <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)' }}>
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className="w-4 h-4" style={{ color: 'hsl(var(--destructive))' }} />
              <span className="text-2xl font-bold" style={{ color: 'hsl(var(--destructive))' }} data-testid="text-vulnerable">
                {data.vulnerable}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Vulnerable ({vulnerablePercent}%)</div>
          </div>
          <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)' }}>
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="w-4 h-4" style={{ color: 'hsl(var(--score-growth))' }} />
              <span className="text-2xl font-bold" style={{ color: 'hsl(var(--score-growth))' }} data-testid="text-resilient">
                {data.highlyResilient}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Highly Resilient ({resilientPercent}%)</div>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="paths" 
                tick={{ fontSize: 12 }}
                label={{ value: 'Disjoint Paths', position: 'bottom', offset: -5, fontSize: 11 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Users', angle: -90, position: 'insideLeft', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value} users`, 'Count']}
                labelFormatter={(label) => `${label} independent paths`}
              />
              <Bar dataKey="count" name="Users" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">0-1 paths:</span>
            <Badge variant="destructive">Vulnerable to single-point failure</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">4+ paths:</span>
            <Badge variant="outline" style={{ borderColor: 'hsl(var(--score-growth))', color: 'hsl(var(--score-growth))' }}>Strong Sybil resistance</Badge>
          </div>
        </div>

        <p className="text-xs text-muted-foreground italic mt-4 text-center">
          Like mycorrhizal networks — resilience comes from multiple independent pathways, not just many connections.
        </p>
      </CardContent>
    </Card>
  );
}
