import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp } from "lucide-react";

interface CohortEntry {
  week: string;
  newcomers: number;
  avgLocalHealth: number;
  retained: number;
  retentionRate: number;
}

interface CohortData {
  cohorts: CohortEntry[];
  summary: {
    totalCohorts: number;
    avgRetention: number;
    totalNewcomers: number;
  };
}

export function GrowthCohortChart() {
  const { data, isLoading } = useQuery<CohortData>({
    queryKey: ['/api/analytics/localhealth/growth-cohorts'],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-growth-cohort-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Growth Cohort Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" data-testid="skeleton-growth-cohort" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.cohorts.length === 0) {
    return (
      <Card data-testid="card-growth-cohort-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Growth Cohort Analysis
          </CardTitle>
          <CardDescription>New user quality over time</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center text-muted-foreground" data-testid="text-growth-cohort-empty">
          No cohort data available yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-growth-cohort">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Growth Cohort Analysis
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" data-testid="badge-cohort-weeks">{data.summary.totalCohorts} weeks</Badge>
            <Badge variant="secondary" data-testid="badge-cohort-retention">
              <TrendingUp className="w-3 h-3 mr-1" />
              {data.summary.avgRetention}% retention
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Weekly cohorts of new users with their LocalHealth evolution and retention
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 py-4" data-testid="chart-growth-cohort">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.cohorts} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="week" 
                className="text-xs fill-muted-foreground"
                tickFormatter={(value) => value.slice(5)} 
              />
              <YAxis 
                yAxisId="left"
                className="text-xs fill-muted-foreground"
                label={{ value: 'Users', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                className="text-xs fill-muted-foreground"
                label={{ value: 'LocalHealth / %', angle: 90, position: 'insideRight' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelFormatter={(label) => `Week: ${label}`}
              />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="newcomers" 
                name="New Users"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="avgLocalHealth" 
                name="Avg LocalHealth"
                stroke="hsl(var(--accent-foreground))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--accent-foreground))' }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="retentionRate" 
                name="Retention %"
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-3 gap-6 mt-6 pt-4 border-t text-center">
          <div>
            <div className="text-2xl font-bold text-primary" data-testid="text-total-newcomers">{data.summary.totalNewcomers}</div>
            <div className="text-xs text-muted-foreground">Total Newcomers</div>
          </div>
          <div>
            <div className="text-2xl font-bold" data-testid="text-total-cohorts">{data.summary.totalCohorts}</div>
            <div className="text-xs text-muted-foreground">Weekly Cohorts</div>
          </div>
          <div>
            <div className="text-2xl font-bold" data-testid="text-avg-retention">{data.summary.avgRetention}%</div>
            <div className="text-xs text-muted-foreground">Avg Retention</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
