import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart } from "recharts";

interface AverageSTSData {
  epoch: string;
  mean: number;
  median: number;
  p25: number;
  p75: number;
}

interface AverageSTSChartProps {
  data: AverageSTSData[];
  isLoading?: boolean;
}

export function AverageSTSChart({ data, isLoading = false }: AverageSTSChartProps) {
  return (
    <Card data-testid="card-average-sts">
      <CardHeader>
        <CardTitle>STS Score Trends</CardTitle>
        <CardDescription>
          Mean and median STS scores with quartile ranges
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]" data-testid="loading-average-sts">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Loading STS trend data...</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px]" data-testid="text-no-average-sts">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No STS trend data available yet</p>
              <p className="text-xs mt-1">Data will appear after network scores are computed</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data}>
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
              dataKey="p75" 
              stroke="hsl(var(--muted))"
              fill="hsl(var(--muted))"
              fillOpacity={0.3}
              name="75th Percentile"
            />
            <Area 
              type="monotone" 
              dataKey="p25" 
              stroke="hsl(var(--muted))"
              fill="hsl(var(--background))"
              fillOpacity={1}
              name="25th Percentile"
            />
            <Line 
              type="monotone" 
              dataKey="mean" 
              stroke="hsl(var(--score-dormant))" 
              strokeWidth={2}
              name="Mean STS"
              dot={{ fill: 'hsl(var(--score-dormant))' }}
            />
            <Line 
              type="monotone" 
              dataKey="median" 
              stroke="hsl(var(--score-transition))" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Median STS"
              dot={{ fill: 'hsl(var(--score-transition))' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
