import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Shield, AlertTriangle, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RiskIndicator {
  address: string;
  fullAddress: string;
  localHealth: number;
  reciprocityRate: number;
  lowStrengthRate: number;
  isNew: boolean;
  riskScore: number;
  riskLevel: 'high' | 'medium' | 'low';
}

interface SybilRiskData {
  riskIndicators: RiskIndicator[];
  overallRisk: 'high' | 'medium' | 'low';
  riskMetrics: {
    highRiskUsers: number;
    mediumRiskUsers: number;
    reciprocalVouchRate: number;
    avgVoucherStrength: number;
  };
}

export function SybilRiskChart() {
  const { data, isLoading } = useQuery<SybilRiskData>({
    queryKey: ['/api/analytics/localhealth/sybil-risk'],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-sybil-risk-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Sybil Risk Radar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" data-testid="skeleton-sybil-risk" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card data-testid="card-sybil-risk-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Sybil Risk Radar
          </CardTitle>
          <CardDescription>Suspicious cluster detection</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center text-muted-foreground" data-testid="text-sybil-risk-empty">
          No risk data available
        </CardContent>
      </Card>
    );
  }

  const totalUsers = data.riskMetrics.highRiskUsers + data.riskMetrics.mediumRiskUsers + (data.riskIndicators.length - data.riskMetrics.highRiskUsers - data.riskMetrics.mediumRiskUsers);
  const highRiskPercent = totalUsers > 0 ? Math.round((data.riskMetrics.highRiskUsers / totalUsers) * 100) : 0;
  const mediumRiskPercent = totalUsers > 0 ? Math.round((data.riskMetrics.mediumRiskUsers / totalUsers) * 100) : 0;
  const lowStrengthPercent = 100 - data.riskMetrics.avgVoucherStrength;

  const radarData = [
    { metric: 'Reciprocity', value: Math.min(100, data.riskMetrics.reciprocalVouchRate), fullMark: 100 },
    { metric: 'High Risk %', value: Math.min(100, highRiskPercent), fullMark: 100 },
    { metric: 'Medium Risk %', value: Math.min(100, mediumRiskPercent), fullMark: 100 },
    { metric: 'Low Strength %', value: Math.min(100, lowStrengthPercent), fullMark: 100 },
  ];

  const getRiskColor = (level: string) => {
    if (level === 'high') return 'text-destructive';
    if (level === 'medium') return 'text-accent-foreground';
    return 'text-muted-foreground';
  };

  const getOverallBadge = (risk: string) => {
    if (risk === 'high') return <Badge variant="destructive" data-testid="badge-overall-risk">High Risk</Badge>;
    if (risk === 'medium') return <Badge variant="secondary" data-testid="badge-overall-risk">Medium Risk</Badge>;
    return <Badge variant="default" data-testid="badge-overall-risk">Low Risk</Badge>;
  };

  return (
    <Card data-testid="card-sybil-risk">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: 'hsl(var(--score-canopy))' }} />
            Sybil Risk Radar
          </span>
          {getOverallBadge(data.overallRisk)}
        </CardTitle>
        <CardDescription>
          Multi-factor analysis: reciprocity, voucher strength, account age, and score patterns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-56 py-4" data-testid="chart-sybil-radar">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid className="stroke-muted" />
              <PolarAngleAxis 
                dataKey="metric" 
                className="text-xs fill-muted-foreground"
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                className="text-xs fill-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`${value}%`, 'Value']}
              />
              <Radar
                name="Risk Score"
                dataKey="value"
                stroke="hsl(var(--destructive))"
                fill="hsl(var(--destructive))"
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t text-center">
          <div>
            <div className="text-lg font-bold text-destructive" data-testid="text-high-risk-users">{data.riskMetrics.highRiskUsers}</div>
            <div className="text-xs text-muted-foreground">High Risk</div>
          </div>
          <div>
            <div className="text-lg font-bold" data-testid="text-medium-risk-users">{data.riskMetrics.mediumRiskUsers}</div>
            <div className="text-xs text-muted-foreground">Medium</div>
          </div>
          <div>
            <div className="text-lg font-bold" data-testid="text-reciprocal-rate">{data.riskMetrics.reciprocalVouchRate}%</div>
            <div className="text-xs text-muted-foreground">Reciprocal</div>
          </div>
          <div>
            <div className="text-lg font-bold" data-testid="text-avg-strength">{data.riskMetrics.avgVoucherStrength}</div>
            <div className="text-xs text-muted-foreground">Avg Strength</div>
          </div>
        </div>

        {data.riskIndicators.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4" style={{ color: 'hsl(var(--score-dormant))' }} />
              <span className="text-sm font-medium">Flagged Users</span>
            </div>
            <ScrollArea className="h-28" data-testid="list-flagged-users">
              <div className="space-y-2">
                {data.riskIndicators.slice(0, 8).map((user, i) => (
                  <div key={i} className="flex justify-between items-center text-xs" data-testid={`row-flagged-user-${i}`}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-3 h-3 ${getRiskColor(user.riskLevel)}`} />
                      <span className="font-mono">{user.address}</span>
                      {user.isNew && <Badge variant="outline" className="text-xs py-0" data-testid={`badge-new-user-${i}`}>New</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {user.reciprocityRate}% recip
                      </span>
                      <Badge 
                        variant={user.riskLevel === 'high' ? 'destructive' : user.riskLevel === 'medium' ? 'secondary' : 'outline'}
                        className="text-xs"
                        data-testid={`badge-risk-score-${i}`}
                      >
                        {user.riskScore}
                      </Badge>
                    </div>
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
