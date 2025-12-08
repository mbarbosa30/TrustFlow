import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Scale } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";

interface DilutionZone {
  zone: string;
  count: number;
  percentage: number;
  penalty: number;
}

interface DilutionZonesData {
  zones: DilutionZone[];
  totalUsers: number;
  avgVouchesGiven: number;
  avgPenalty: number;
}

const ZONE_COLORS = {
  'Quality (1-10)': 'hsl(142, 76%, 36%)',
  'Warning (11-15)': 'hsl(45, 93%, 47%)',
  'Penalty (16-25)': 'hsl(25, 95%, 53%)',
  'Critical (25+)': 'hsl(0, 84%, 60%)',
};

export function DilutionZonesChart() {
  const { data, isLoading, error } = useQuery<DilutionZonesData>({
    queryKey: ['/api/analytics/localhealth/dilution-zones'],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-dilution-zones-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Dilution Zone Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card data-testid="card-dilution-zones-error">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Dilution Zone Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">Failed to load dilution zones data</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.zones.map(zone => ({
    ...zone,
    fill: ZONE_COLORS[zone.zone as keyof typeof ZONE_COLORS] || 'hsl(var(--primary))',
  }));

  return (
    <Card data-testid="card-dilution-zones">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="w-5 h-5" />
          Dilution Zone Distribution
        </CardTitle>
        <CardDescription>
          Piecewise penalty curve: how many users fall into each vouch quality zone
        </CardDescription>
      </CardHeader>
      <CardContent className="py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold" data-testid="text-total-users">{data.totalUsers}</div>
            <div className="text-xs text-muted-foreground">Total Users</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold" data-testid="text-avg-vouches">{data.avgVouchesGiven}</div>
            <div className="text-xs text-muted-foreground">Avg Vouches Given</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold" data-testid="text-avg-penalty">{data.avgPenalty}%</div>
            <div className="text-xs text-muted-foreground">Avg Penalty</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-500/10">
            <div className="text-2xl font-bold text-green-600" data-testid="text-quality-pct">
              {data.zones[0]?.percentage || 0}%
            </div>
            <div className="text-xs text-muted-foreground">In Quality Zone</div>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" domain={[0, 'auto']} />
              <YAxis dataKey="zone" type="category" width={120} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'count') return [`${value} users`, 'Count'];
                  if (name === 'percentage') return [`${value}%`, 'Percentage'];
                  return [value, name];
                }}
              />
              <Bar dataKey="count" name="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {data.zones.map((zone, i) => (
            <Badge
              key={zone.zone}
              variant="outline"
              className="text-xs"
              style={{ borderColor: ZONE_COLORS[zone.zone as keyof typeof ZONE_COLORS] }}
              data-testid={`badge-zone-${i}`}
            >
              {zone.zone}: {zone.count} ({zone.percentage}%)
            </Badge>
          ))}
        </div>

        <p className="text-xs text-muted-foreground italic mt-4 text-center">
          Like pruning in ecosystems — over-extended vouchers face natural dilution to maintain network quality.
        </p>
      </CardContent>
    </Card>
  );
}
