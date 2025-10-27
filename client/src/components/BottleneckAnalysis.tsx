import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface Bottleneck {
  edgeLabel: string;
  impact: string;
}

interface BottleneckAnalysisProps {
  bottlenecks: Bottleneck[];
}

export function BottleneckAnalysis({ bottlenecks }: BottleneckAnalysisProps) {
  return (
    <Card data-testid="card-bottlenecks">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Bottlenecks
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Saturated edges that limited more flow reaching you
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {bottlenecks.map((bottleneck, index) => (
          <div
            key={index}
            className="p-3 rounded-lg bg-muted/30"
            data-testid={`bottleneck-${index}`}
          >
            <div className="font-mono text-sm mb-1">{bottleneck.edgeLabel}</div>
            <div className="text-xs text-muted-foreground">{bottleneck.impact}</div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground mt-4">
          Flow constrained mainly at these points. Additional endorsements here would
          increase your score.
        </p>
      </CardContent>
    </Card>
  );
}
