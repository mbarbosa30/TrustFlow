import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface EndorsementVelocityData {
  epoch: string;
  newEndorsements: number;
  revokedEndorsements: number;
}

interface EndorsementVelocityChartProps {
  data: EndorsementVelocityData[];
  isLoading?: boolean;
}

export function EndorsementVelocityChart({ data, isLoading = false }: EndorsementVelocityChartProps) {
  return (
    <Card data-testid="card-endorsement-velocity">
      <CardHeader>
        <CardTitle>Endorsement Activity</CardTitle>
        <CardDescription>
          New and revoked endorsements per epoch
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]" data-testid="loading-endorsement-velocity">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Loading endorsement activity data...</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px]" data-testid="text-no-endorsement-velocity">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No endorsement activity data available yet</p>
              <p className="text-xs mt-1">Data will appear after multiple epochs are computed</p>
            </div>
          </div>
        ) : (
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
                fill="hsl(var(--score-growth))" 
                name="New Endorsements"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="revokedEndorsements" 
                fill="hsl(var(--destructive))" 
                name="Revoked"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
