import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface STSComponent {
  name: string;
  value: number;
  weight: number;
  contribution: number;
  description: string;
  formula?: React.ReactNode;
}

interface STSBreakdownProps {
  components: STSComponent[];
  totalSTS: number;
}

export function STSBreakdown({ components, totalSTS }: STSBreakdownProps) {
  return (
    <Card data-testid="card-sts-breakdown">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Score Calculation (STS)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your Standardized Trust Score (0-100) is a weighted blend of four components
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center py-4 border rounded-lg bg-muted/30">
          <div className="text-4xl font-bold mb-1" data-testid="text-total-sts">
            {totalSTS}
          </div>
          <div className="text-sm text-muted-foreground font-mono">
            = 100 × (0.55F + 0.25C + 0.10S + 0.10D)
          </div>
        </div>

        <div className="space-y-4">
          {components.map((component, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{component.name}</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs mb-2">{component.description}</p>
                      {component.formula && (
                        <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          {component.formula}
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {component.value.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(component.weight * 100).toFixed(0)}% weight
                  </div>
                </div>
              </div>
              <Progress value={component.value * 100} className="h-2" />
              <div className="text-xs text-muted-foreground text-right">
                contributes {component.contribution.toFixed(1)} to STS
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground pt-4 border-t space-y-2">
          <p>
            <strong>F:</strong> Normalized flow (log-scaled against 95th percentile)
          </p>
          <p>
            <strong>C:</strong> Normalized min-cut (path redundancy)
          </p>
          <p>
            <strong>S:</strong> Stability (1 − worst single-edge impact)
          </p>
          <p className="font-mono">
            <strong>D:</strong> Distance decay from seeds (e<sup>−0.35×hops</sup>)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
