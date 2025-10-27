import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface EndorsementVelocityData {
  epoch: string;
  newEndorsements: number;
  revokedEndorsements: number;
}

interface EndorsementVelocityChartProps {
  data: EndorsementVelocityData[];
}

export function EndorsementVelocityChart({ data }: EndorsementVelocityChartProps) {
  return (
    <Card data-testid="card-endorsement-velocity">
      <CardHeader>
        <CardTitle>Endorsement Activity</CardTitle>
        <CardDescription>
          New and revoked endorsements per epoch
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
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
            <Bar 
              dataKey="newEndorsements" 
              fill="hsl(var(--chart-1))" 
              name="New Endorsements"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="revokedEndorsements" 
              fill="hsl(var(--chart-5))" 
              name="Revoked"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
