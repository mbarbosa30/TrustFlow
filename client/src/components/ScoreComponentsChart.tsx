import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ScoreComponentsData {
  epoch: string;
  flow: number;
  cut: number;
  stability: number;
  depth: number;
  pageRank: number;
}

interface ScoreComponentsChartProps {
  data: ScoreComponentsData[];
  isLoading?: boolean;
}

export function ScoreComponentsChart({ data, isLoading = false }: ScoreComponentsChartProps) {
  return (
    <Card data-testid="card-score-components">
      <CardHeader>
        <CardTitle>STS Component Breakdown</CardTitle>
        <CardDescription>
          Average contribution of each component (Flow 55%, Cut 25%, Stability 10%, Depth 10%, PageRank 0%)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]" data-testid="loading-score-components">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Loading score component data...</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px]" data-testid="text-no-score-components">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No score component data available yet</p>
              <p className="text-xs mt-1">Data will appear after network scores are computed</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="epoch" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="flow" 
              stackId="1"
              stroke="hsl(var(--score-dormant))" 
              fill="hsl(var(--score-dormant))"
              name="Flow (55%)"
            />
            <Area 
              type="monotone" 
              dataKey="cut" 
              stackId="1"
              stroke="hsl(var(--score-growth))" 
              fill="hsl(var(--score-growth))"
              name="Cut (25%)"
            />
            <Area 
              type="monotone" 
              dataKey="stability" 
              stackId="1"
              stroke="hsl(var(--score-transition))" 
              fill="hsl(var(--score-transition))"
              name="Stability (10%)"
            />
            <Area 
              type="monotone" 
              dataKey="depth" 
              stackId="1"
              stroke="hsl(var(--score-canopy))" 
              fill="hsl(var(--score-canopy))"
              name="Depth (10%)"
            />
            <Area 
              type="monotone" 
              dataKey="pageRank" 
              stackId="1"
              stroke="hsl(var(--muted-foreground))" 
              fill="hsl(var(--muted-foreground))"
              name="PageRank (0%)"
            />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
