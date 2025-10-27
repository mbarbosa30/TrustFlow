import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface NetworkGrowthData {
  epoch: string;
  totalUsers: number;
  activeUsers: number;
}

interface NetworkGrowthChartProps {
  data: NetworkGrowthData[];
}

export function NetworkGrowthChart({ data }: NetworkGrowthChartProps) {
  return (
    <Card data-testid="card-network-growth">
      <CardHeader>
        <CardTitle>Network Growth</CardTitle>
        <CardDescription>
          Total and active users over time
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Total Users"
              dot={{ fill: 'hsl(var(--primary))' }}
            />
            <Line 
              type="monotone" 
              dataKey="activeUsers" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              name="Active Users"
              dot={{ fill: 'hsl(var(--chart-2))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
