import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ScoreComponentsData {
  epoch: string;
  flow: number;
  cut: number;
  stability: number;
  depth: number;
}

interface ScoreComponentsChartProps {
  data: ScoreComponentsData[];
}

export function ScoreComponentsChart({ data }: ScoreComponentsChartProps) {
  return (
    <Card data-testid="card-score-components">
      <CardHeader>
        <CardTitle>STS Component Breakdown</CardTitle>
        <CardDescription>
          Average contribution of each component (Flow 55%, Cut 25%, Stability 10%, Depth 10%)
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              stroke="hsl(var(--chart-1))" 
              fill="hsl(var(--chart-1))"
              name="Flow (55%)"
            />
            <Area 
              type="monotone" 
              dataKey="cut" 
              stackId="1"
              stroke="hsl(var(--chart-2))" 
              fill="hsl(var(--chart-2))"
              name="Cut (25%)"
            />
            <Area 
              type="monotone" 
              dataKey="stability" 
              stackId="1"
              stroke="hsl(var(--chart-3))" 
              fill="hsl(var(--chart-3))"
              name="Stability (10%)"
            />
            <Area 
              type="monotone" 
              dataKey="depth" 
              stackId="1"
              stroke="hsl(var(--chart-4))" 
              fill="hsl(var(--chart-4))"
              name="Depth (10%)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
