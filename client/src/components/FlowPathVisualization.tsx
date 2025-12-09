import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PathNode {
  id: string;
  label: string;
  isAnonymous: boolean;
}

interface FlowPath {
  nodes: PathNode[];
}

interface FlowPathVisualizationProps {
  paths: FlowPath[];
}

export function FlowPathVisualization({ paths }: FlowPathVisualizationProps) {
  return (
    <Card data-testid="card-flow-paths">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Network Flow Paths</CardTitle>
        <p className="text-sm text-muted-foreground">
          Top {paths.length} independent signal paths from seeds to you
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {paths.map((path, pathIndex) => (
          <div
            key={pathIndex}
            className="p-3 rounded-lg bg-muted/30 space-y-2"
            data-testid={`path-${pathIndex}`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              {path.nodes.map((node, nodeIndex) => (
                <div key={nodeIndex} className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Circle className="w-2 h-2 fill-current" style={{ color: 'hsl(var(--score-growth))' }} />
                    <span className="text-sm font-mono">
                      {node.isAnonymous ? "•••" : node.label}
                    </span>
                  </div>
                  {nodeIndex < path.nodes.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
            {path.nodes.some((n) => n.isAnonymous) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                data-testid={`button-reveal-path-${pathIndex}`}
              >
                Request reveal from participants
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
