import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, GitBranch, Hash, CheckCircle2, XCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PageRankMetricsProps {
  data: {
    prSkew: number;
    seedConcentration: number;
    maxScore: number;
    p95Score: number;
    iterations: number;
    converged: boolean;
  } | null;
  isLoading?: boolean;
}

export function PageRankMetrics({ data, isLoading = false }: PageRankMetricsProps) {
  if (isLoading) {
    return (
      <Card data-testid="card-pagerank-metrics">
        <CardHeader>
          <CardTitle>PageRank Analytics</CardTitle>
          <CardDescription>Seed-personalized PageRank metrics (experimental)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading PageRank metrics...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card data-testid="card-pagerank-metrics">
        <CardHeader>
          <CardTitle>PageRank Analytics</CardTitle>
          <CardDescription>Seed-personalized PageRank metrics (experimental)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground text-center">
              <p className="text-sm">No PageRank data available</p>
              <p className="text-xs mt-1">PageRank weight is currently set to 0% (disabled)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSkewStatus = (skew: number): { status: string; colorStyle: React.CSSProperties; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    // prSkew = 1 - Gini coefficient, range 0-1, higher = better (more equal distribution)
    if (skew >= 0.7) return { status: 'Low Skew', colorStyle: { color: 'hsl(var(--score-growth))' }, variant: 'default' };
    if (skew >= 0.4) return { status: 'Moderate Skew', colorStyle: { color: 'hsl(var(--score-transition))' }, variant: 'secondary' };
    return { status: 'High Skew', colorStyle: { color: 'hsl(var(--destructive))' }, variant: 'destructive' };
  };

  const getConcentrationStatus = (concentration: number): { status: string; colorStyle: React.CSSProperties; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    if (concentration < 0.3) return { status: 'Distributed', colorStyle: { color: 'hsl(var(--score-growth))' }, variant: 'default' };
    if (concentration < 0.5) return { status: 'Balanced', colorStyle: { color: 'hsl(var(--score-transition))' }, variant: 'secondary' };
    return { status: 'Concentrated', colorStyle: { color: 'hsl(var(--destructive))' }, variant: 'destructive' };
  };

  const skewStatus = getSkewStatus(data.prSkew);
  const concentrationStatus = getConcentrationStatus(data.seedConcentration);

  return (
    <Card data-testid="card-pagerank-metrics">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              PageRank Analytics
              <Badge variant="outline" className="text-xs">Experimental</Badge>
            </CardTitle>
            <CardDescription>
              Seed-personalized PageRank metrics (currently 0% weight in STS)
            </CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger>
              {data.converged ? (
                <CheckCircle2 className="w-5 h-5" style={{ color: 'hsl(var(--score-growth))' }} data-testid="icon-converged" />
              ) : (
                <XCircle className="w-5 h-5" style={{ color: 'hsl(var(--score-transition))' }} data-testid="icon-not-converged" />
              )}
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {data.converged 
                  ? `Converged after ${data.iterations} iterations` 
                  : `Did not fully converge (${data.iterations} iterations)`}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-help">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">PR Skew</div>
                    <div className="text-xs text-muted-foreground">Score distribution inequality</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono" data-testid="text-pr-skew">
                    {data.prSkew.toFixed(2)}
                  </div>
                  <Badge variant={skewStatus.variant} className="text-xs mt-1">
                    {skewStatus.status}
                  </Badge>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-2">
                <div className="font-semibold text-sm">PageRank Skew</div>
                <div className="text-xs text-muted-foreground">
                  Measures how evenly PageRank scores are distributed. Calculated as 1 - Gini coefficient. 
                  Higher values (closer to 1) indicate more equal distribution of trust across the network, 
                  which is healthier. Lower values indicate concentrated trust in few users.
                </div>
                <div className="text-xs pt-2 border-t">
                  <div>Scale: 0.0 (highly concentrated) to 1.0 (perfectly equal)</div>
                  <div>Healthy threshold: ≥ 0.7</div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-help">
                <div className="flex items-center gap-3">
                  <GitBranch className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Seed Concentration</div>
                    <div className="text-xs text-muted-foreground">Top seed influence share</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono" data-testid="text-seed-concentration">
                    {(data.seedConcentration * 100).toFixed(1)}%
                  </div>
                  <Badge variant={concentrationStatus.variant} className="text-xs mt-1">
                    {concentrationStatus.status}
                  </Badge>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-2">
                <div className="font-semibold text-sm">Seed Concentration</div>
                <div className="text-xs text-muted-foreground">
                  Shows the total PageRank mass held by the top 3 seeds. Lower values indicate trust is more 
                  evenly distributed across seed nodes, reducing centralization risk.
                </div>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-help">
                <div className="flex items-center gap-3">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Convergence</div>
                    <div className="text-xs text-muted-foreground">Power iteration count</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono" data-testid="text-iterations">
                    {data.iterations}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    iterations
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-2">
                <div className="font-semibold text-sm">Algorithm Convergence</div>
                <div className="text-xs text-muted-foreground">
                  Number of power iterations required for PageRank to converge (threshold: 10⁻⁸). 
                  Fewer iterations indicate a more stable trust graph structure.
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> PageRank is currently experimental with 0% weight in STS calculations. 
            These metrics help evaluate network structure and prepare for future transaction-weighted reputation (Phase 2).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
