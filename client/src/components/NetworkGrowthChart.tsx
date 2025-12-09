import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface NetworkGrowthData {
  epoch: string;
  totalUsers: number;
  activeUsers: number;
}

interface NetworkGrowthChartProps {
  data: NetworkGrowthData[];
  isLoading?: boolean;
}

export function NetworkGrowthChart({ data, isLoading = false }: NetworkGrowthChartProps) {
  return (
    <Card data-testid="card-network-growth">
      <CardHeader>
        <CardTitle>Network Growth</CardTitle>
        <CardDescription>
          Total and active users over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]" data-testid="loading-network-growth">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Loading network growth data...</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px]" data-testid="text-no-network-growth">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No network growth data available yet</p>
              <p className="text-xs mt-1">Data will appear after multiple epochs are computed</p>
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
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
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
                type="monotone" 
                dataKey="totalUsers" 
                stroke="hsl(var(--score-dormant))" 
                strokeWidth={2}
                name="Total Users"
                dot={{ fill: 'hsl(var(--score-dormant))' }}
              />
              <Line 
                type="monotone" 
                dataKey="activeUsers" 
                stroke="hsl(var(--score-growth))" 
                strokeWidth={2}
                name="Active Users"
                dot={{ fill: 'hsl(var(--score-growth))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
