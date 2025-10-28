import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface NetworkDensityData {
  epoch: string;
  endorsementsPerUser: number;
  avgPathLength: number;
}

interface NetworkDensityChartProps {
  data: NetworkDensityData[];
  isLoading?: boolean;
}

export function NetworkDensityChart({ data, isLoading = false }: NetworkDensityChartProps) {
  return (
    <Card data-testid="card-network-density">
      <CardHeader>
        <CardTitle>Network Connectivity</CardTitle>
        <CardDescription>
          Endorsements per user and average trust path length
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]" data-testid="loading-network-density">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Loading network density data...</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px]" data-testid="text-no-network-density">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No network density data available yet</p>
              <p className="text-xs mt-1">Data will appear after trust scores are computed</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="epoch" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              yAxisId="left"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              label={{ value: 'Endorsements/User', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              label={{ value: 'Avg Path Length', angle: 90, position: 'insideRight' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="endorsementsPerUser" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Endorsements per User"
              dot={{ fill: 'hsl(var(--primary))' }}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="avgPathLength" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              name="Avg Path Length"
              dot={{ fill: 'hsl(var(--chart-2))' }}
            />
          </LineChart>
        </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
