import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Scale, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

interface EndorserEntry {
  address: string;
  fullAddress: string;
  localHealth: number;
  vouchesGiven: number;
  excessVouches: number;
  dilutionPenalty: number;
  avgBeneficiaryHealth: number;
  status: 'critical' | 'warning' | 'healthy';
}

interface DilutionData {
  endorsers: EndorserEntry[];
  networkDilution: {
    avgPenalty: number;
    affectedUsers: number;
    totalPenaltyPoints: number;
  };
}

export function DilutionPressureChart() {
  const { data, isLoading } = useQuery<DilutionData>({
    queryKey: ['/api/analytics/localhealth/dilution-pressure'],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-dilution-pressure-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Dilution Pressure Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" data-testid="skeleton-dilution-pressure" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.endorsers.length === 0) {
    return (
      <Card data-testid="card-dilution-pressure-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Dilution Pressure Dashboard
          </CardTitle>
          <CardDescription>Over-extended endorsers monitoring</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center text-muted-foreground" data-testid="text-dilution-pressure-empty">
          No dilution data available
        </CardContent>
      </Card>
    );
  }

  const chartData = data.endorsers
    .filter(e => e.dilutionPenalty > 0)
    .slice(0, 12);

  const getBarColor = (status: string) => {
    if (status === 'critical') return 'hsl(var(--destructive))';
    if (status === 'warning') return 'hsl(var(--accent-foreground))';
    return 'hsl(var(--muted-foreground))';
  };

  return (
    <Card data-testid="card-dilution-pressure">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Scale className="w-5 h-5" style={{ color: 'hsl(var(--score-transition))' }} />
            Dilution Pressure
          </span>
          <div className="flex items-center gap-2">
            <Badge variant={data.networkDilution.affectedUsers > 5 ? "destructive" : "outline"} data-testid="badge-affected-users">
              {data.networkDilution.affectedUsers} affected
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Endorsers with 10+ vouches receive dilution penalties (10% per excess vouch, max 50%)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-64 py-4" data-testid="chart-dilution-pressure">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="address" 
                  className="text-xs fill-muted-foreground"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  domain={[0, 50]}
                  className="text-xs fill-muted-foreground"
                  label={{ value: 'Penalty %', angle: -90, position: 'insideLeft' }}
                />
                <ReferenceLine 
                  y={30} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="5 5"
                  label={{ value: 'Critical', position: 'right', fill: 'hsl(var(--destructive))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value}%`,
                    `Penalty (${props.payload.vouchesGiven} vouches)`
                  ]}
                />
                <Bar 
                  dataKey="dilutionPenalty" 
                  name="Dilution Penalty"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} data-testid={`bar-dilution-${index}`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground" data-testid="text-no-penalties">
            <div className="text-center">
              <Scale className="w-12 h-12 mx-auto mb-3" style={{ color: 'hsl(var(--score-transition) / 0.3)' }} />
              <p>No endorsers with dilution penalties</p>
              <p className="text-xs mt-1">All endorsers have 10 or fewer vouches</p>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t text-center">
          <div>
            <div className="text-2xl font-bold" data-testid="text-affected-users">{data.networkDilution.affectedUsers}</div>
            <div className="text-xs text-muted-foreground">Affected Users</div>
          </div>
          <div>
            <div className="text-2xl font-bold" data-testid="text-avg-penalty">{data.networkDilution.avgPenalty}%</div>
            <div className="text-xs text-muted-foreground">Avg Penalty</div>
          </div>
          <div>
            <div className="text-2xl font-bold" data-testid="text-total-penalty">{data.networkDilution.totalPenaltyPoints}</div>
            <div className="text-xs text-muted-foreground">Total Penalty Pts</div>
          </div>
        </div>

        {data.endorsers.filter(e => e.status === 'critical').length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="text-sm font-medium">Critical Dilution</span>
            </div>
            <ScrollArea className="h-24" data-testid="list-critical-dilution">
              <div className="space-y-2">
                {data.endorsers.filter(e => e.status === 'critical').slice(0, 5).map((e, i) => (
                  <div key={i} className="space-y-1" data-testid={`row-critical-dilution-${i}`}>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono">{e.address}</span>
                      <span>{e.vouchesGiven} vouches → {e.dilutionPenalty}% penalty</span>
                    </div>
                    <Progress value={100 - e.dilutionPenalty} className="h-1" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
