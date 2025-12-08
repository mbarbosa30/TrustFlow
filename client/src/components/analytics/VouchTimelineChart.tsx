import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Bar, Line } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Calendar, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";

interface TimelineEntry {
  date: string;
  vouches: number;
  uniqueEndorsers: number;
  uniqueEndorsees: number;
  cumulativeVouches: number;
  cumulativeUsers: number;
}

interface TimelineData {
  timeline: TimelineEntry[];
}

export function VouchTimelineChart() {
  const { data, isLoading } = useQuery<TimelineData>({
    queryKey: ['/api/analytics/vouch-timeline'],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-vouch-timeline-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Vouch Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.timeline.length === 0) {
    return (
      <Card data-testid="card-vouch-timeline-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Vouch Activity Timeline
          </CardTitle>
          <CardDescription>Timestamp-based network activity</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          No vouch activity recorded yet
        </CardContent>
      </Card>
    );
  }

  const latest = data.timeline[data.timeline.length - 1];
  const chartData = data.timeline.map(d => ({
    ...d,
    date: format(parseISO(d.date), 'MMM d'),
    fullDate: d.date
  }));

  return (
    <Card data-testid="card-vouch-timeline">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Network Activity Timeline
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{data.timeline.length} days</Badge>
            <Badge variant="secondary">
              <TrendingUp className="w-3 h-3 mr-1" />
              {latest?.cumulativeVouches || 0} total
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Daily vouch activity based on real timestamps (not epochs)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVouches" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs fill-muted-foreground"
              />
              <YAxis 
                yAxisId="left"
                className="text-xs fill-muted-foreground"
                label={{ value: 'Daily Vouches', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                className="text-xs fill-muted-foreground"
                label={{ value: 'Cumulative', angle: 90, position: 'insideRight' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="vouches" 
                name="Daily Vouches"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="cumulativeVouches" 
                name="Total Vouches"
                stroke="hsl(var(--accent-foreground))" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="cumulativeUsers" 
                name="Total Users"
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t text-center">
          <div>
            <div className="text-lg font-bold text-primary">{latest?.cumulativeVouches || 0}</div>
            <div className="text-xs text-muted-foreground">Total Vouches</div>
          </div>
          <div>
            <div className="text-lg font-bold">{latest?.cumulativeUsers || 0}</div>
            <div className="text-xs text-muted-foreground">Network Users</div>
          </div>
          <div>
            <div className="text-lg font-bold">
              {data.timeline.length > 0 
                ? (latest.cumulativeVouches / data.timeline.length).toFixed(1)
                : 0}
            </div>
            <div className="text-xs text-muted-foreground">Avg/Day</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
