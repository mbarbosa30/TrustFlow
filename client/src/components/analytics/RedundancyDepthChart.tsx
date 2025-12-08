import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Layers, Network } from "lucide-react";

interface DepthEntry {
  address: string;
  direct: number;
  secondHop: number;
  thirdHop: number;
  localHealth: number;
}

interface RedundancyDepthData {
  heatmapData: DepthEntry[];
  depthDistribution: {
    direct: number;
    secondHop: number;
    thirdHop: number;
  };
  avgDepth: number;
}

export function RedundancyDepthChart() {
  const { data, isLoading } = useQuery<RedundancyDepthData>({
    queryKey: ['/api/analytics/localhealth/redundancy-depth'],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-redundancy-depth-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Redundancy Depth Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" data-testid="skeleton-redundancy-depth" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.heatmapData.length === 0) {
    return (
      <Card data-testid="card-redundancy-depth-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Redundancy Depth Analysis
          </CardTitle>
          <CardDescription>Direct vs multi-hop support</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center text-muted-foreground" data-testid="text-redundancy-depth-empty">
          No redundancy data available
        </CardContent>
      </Card>
    );
  }

  const chartData = data.heatmapData.slice(0, 15).map(d => ({
    ...d,
    total: d.direct + d.secondHop + d.thirdHop
  }));

  return (
    <Card data-testid="card-redundancy-depth">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Redundancy Depth
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" data-testid="badge-avg-depth">Avg: {data.avgDepth}</Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Support distribution across hop distances — direct vouchers vs upstream supporters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 py-4" data-testid="chart-redundancy-depth">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ top: 10, right: 30, left: 60, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                type="number"
                className="text-xs fill-muted-foreground"
              />
              <YAxis 
                type="category"
                dataKey="address" 
                className="text-xs fill-muted-foreground"
                width={55}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => [value, name]}
              />
              <Legend />
              <Bar 
                dataKey="direct" 
                name="Direct (Hop 1)"
                stackId="a"
                fill="hsl(var(--primary))"
              />
              <Bar 
                dataKey="secondHop" 
                name="2nd Hop"
                stackId="a"
                fill="hsl(var(--accent-foreground))"
              />
              <Bar 
                dataKey="thirdHop" 
                name="3rd Hop"
                stackId="a"
                fill="hsl(var(--muted-foreground))"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t text-center">
          <div>
            <div className="text-2xl font-bold text-primary" data-testid="text-direct-support">{data.depthDistribution.direct}%</div>
            <div className="text-xs text-muted-foreground">Direct Support</div>
          </div>
          <div>
            <div className="text-2xl font-bold" data-testid="text-second-hop">{data.depthDistribution.secondHop}%</div>
            <div className="text-xs text-muted-foreground">2nd Hop</div>
          </div>
          <div>
            <div className="text-2xl font-bold" data-testid="text-third-hop">{data.depthDistribution.thirdHop}%</div>
            <div className="text-xs text-muted-foreground">3rd Hop</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Network className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Interpretation</span>
          </div>
          <p className="text-xs text-muted-foreground" data-testid="text-redundancy-interpretation">
            Higher direct support (Hop 1) indicates strong immediate connections. 
            Deep multi-hop support (Hop 2-3) shows network resilience and redundancy.
            A healthy network has both strong direct connections and backup paths.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
