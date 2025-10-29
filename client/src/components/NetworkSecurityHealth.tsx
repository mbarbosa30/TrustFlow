import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";

interface SecurityHealthProps {
  data: {
    seedSaturation: {
      maxShare: number;
      maxSeedAddress: string | null;
      status: 'healthy' | 'caution' | 'warning';
    } | null;
    pathDiversity: {
      average: number;
      status: 'healthy' | 'moderate' | 'low';
    };
    avgMinCut: {
      value: number;
      status: 'strong' | 'adequate' | 'weak';
    };
    acceptedUsers: number;
    epochId: number;
  } | null;
  isLoading: boolean;
}

export function NetworkSecurityHealth({ data, isLoading }: SecurityHealthProps) {
  if (isLoading) {
    return (
      <Card data-testid="card-security-health">
        <CardHeader>
          <CardTitle>Network Security Health</CardTitle>
          <CardDescription>Sybil resistance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading security metrics...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card data-testid="card-security-health">
        <CardHeader>
          <CardTitle>Network Security Health</CardTitle>
          <CardDescription>Sybil resistance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">No security data available</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"><ShieldCheck className="h-3 w-3 mr-1" /> Healthy</Badge>;
      case 'strong':
        return <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"><ShieldCheck className="h-3 w-3 mr-1" /> Strong</Badge>;
      case 'adequate':
        return <Badge variant="default" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"><ShieldCheck className="h-3 w-3 mr-1" /> Adequate</Badge>;
      case 'moderate':
        return <Badge variant="default" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"><ShieldAlert className="h-3 w-3 mr-1" /> Moderate</Badge>;
      case 'caution':
        return <Badge variant="default" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"><ShieldAlert className="h-3 w-3 mr-1" /> Caution</Badge>;
      case 'warning':
        return <Badge variant="default" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"><AlertTriangle className="h-3 w-3 mr-1" /> Warning</Badge>;
      case 'weak':
        return <Badge variant="default" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"><AlertTriangle className="h-3 w-3 mr-1" /> Weak</Badge>;
      case 'low':
        return <Badge variant="default" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"><AlertTriangle className="h-3 w-3 mr-1" /> Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card data-testid="card-security-health">
      <CardHeader>
        <CardTitle>Network Security Health</CardTitle>
        <CardDescription>
          Sybil resistance indicators for epoch {data.epochId} ({data.acceptedUsers} accepted users)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30" data-testid="metric-avg-min-cut">
            <div>
              <div className="text-sm font-medium">Average Min-Cut</div>
              <div className="text-xs text-muted-foreground mt-1">
                Path redundancy measure
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold font-mono" data-testid="value-avg-min-cut">
                {data.avgMinCut.value.toFixed(2)}
              </span>
              {getStatusBadge(data.avgMinCut.status)}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30" data-testid="metric-path-diversity">
            <div>
              <div className="text-sm font-medium">Path Diversity Index</div>
              <div className="text-xs text-muted-foreground mt-1">
                Average redundancy ratio (min-cut/flow)
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold font-mono" data-testid="value-path-diversity">
                {data.pathDiversity.average}%
              </span>
              {getStatusBadge(data.pathDiversity.status)}
            </div>
          </div>

          {data.seedSaturation ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30" data-testid="metric-seed-saturation">
              <div>
                <div className="text-sm font-medium">Seed Saturation</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Max flow share from single seed
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold font-mono" data-testid="value-seed-saturation">
                  {data.seedSaturation.maxShare}%
                </span>
                {getStatusBadge(data.seedSaturation.status)}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
              Seed saturation data not available (requires recompute)
            </div>
          )}

          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Lower seed saturation and higher path diversity indicate stronger Sybil resistance. 
              See <span className="font-medium text-foreground">How It Works → Security Model</span> for details.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
