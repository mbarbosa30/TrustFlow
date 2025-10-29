import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ComponentsBreakdownProps {
  components?: {
    flow: number;
    minCut: number;
    stability: number;
    depth: number;
    pageRank: number;
  };
  isLoading?: boolean;
}

export function ComponentsBreakdown({ components, isLoading = false }: ComponentsBreakdownProps) {
  if (isLoading) {
    return (
      <Card data-testid="card-components-breakdown">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">Loading components...</div>
        </CardContent>
      </Card>
    );
  }

  if (!components) {
    return (
      <Card data-testid="card-components-breakdown">
        <CardHeader>
          <CardTitle>Score Components</CardTitle>
          <CardDescription>Detailed breakdown of your trust score</CardDescription>
        </CardHeader>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">
            Component data will be available after your score is calculated
          </p>
        </CardContent>
      </Card>
    );
  }

  const componentData = [
    {
      name: "Flow",
      value: (components.flow * 100).toFixed(1) + "%",
      rawValue: components.flow,
      weight: "55%",
      description: "Max-flow capacity from seeds to you through independent paths. Measures the volume of trust that can reach you.",
      color: "hsl(var(--chart-1))",
    },
    {
      name: "Min-Cut",
      value: components.minCut.toFixed(0),
      rawValue: components.minCut,
      weight: "25%",
      description: "Minimum number of edges to disconnect you from seeds. Measures resistance to Sybil attacks.",
      color: "hsl(var(--chart-2))",
    },
    {
      name: "Stability",
      value: (components.stability * 100).toFixed(1) + "%",
      rawValue: components.stability,
      weight: "5%",
      description: "How much your score changes when individual seeds are removed. Higher = more resilient network position.",
      color: "hsl(var(--chart-3))",
    },
    {
      name: "Depth",
      value: components.depth.toFixed(0) + " hops",
      rawValue: components.depth,
      weight: "10%",
      description: "Shortest path distance from seeds. Lower depth = closer to trusted sources.",
      color: "hsl(var(--chart-4))",
    },
    {
      name: "PageRank",
      value: (components.pageRank * 100).toFixed(1) + "%",
      rawValue: components.pageRank,
      weight: "5%",
      description: "Seed-personalized PageRank measuring network embeddedness. Higher = better connected to the trust graph.",
      color: "hsl(var(--chart-5))",
    },
  ];

  return (
    <Card data-testid="card-components-breakdown">
      <CardHeader>
        <CardTitle>Score Components</CardTitle>
        <CardDescription>
          Detailed breakdown of the factors contributing to your STS
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {componentData.map((component) => (
            <div key={component.name} className="flex items-start gap-3">
              <div 
                className="w-1 h-14 rounded-full mt-1" 
                style={{ backgroundColor: component.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{component.name}</span>
                    <span className="text-xs text-muted-foreground">({component.weight})</span>
                  </div>
                  <span className="font-mono text-sm font-semibold" data-testid={`text-component-${component.name.toLowerCase()}`}>
                    {component.value}
                  </span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-start gap-1 cursor-help">
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {component.description}
                      </p>
                      <Info className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-2">
                      <div className="font-semibold text-sm">{component.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {component.description}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>STS Calculation:</strong> Your Standardized Trust Score (0-100) is computed as a weighted sum of these normalized components: 
            55% Flow + 25% Min-Cut + 5% Stability + 10% Depth + 5% PageRank.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
