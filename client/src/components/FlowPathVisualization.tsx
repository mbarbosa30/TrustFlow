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
              {path.nodes.map((node, nodeIndex) => {
                // Differentiate node types: seeds are canopy, known are growth, anonymous are stone
                const isFirst = nodeIndex === 0;
                const isLast = nodeIndex === path.nodes.length - 1;
                let nodeColor = '--score-growth';
                if (isFirst) {
                  nodeColor = '--score-canopy';  // Seed nodes are forest green
                } else if (node.isAnonymous) {
                  nodeColor = '--score-stone';   // Anonymous nodes are stone
                } else if (isLast) {
                  nodeColor = '--score-sun';     // Target node is amber
                }
                
                return (
                  <div key={nodeIndex} className="flex items-center gap-2">
                    <div 
                      className="flex items-center gap-2 px-2 py-1 rounded-md transition-all duration-200 hover:scale-105"
                      style={{ 
                        backgroundColor: `hsl(var(${nodeColor}) / 0.1)`,
                        border: `1px solid hsl(var(${nodeColor}) / 0.3)`
                      }}
                    >
                      <Circle 
                        className="w-2.5 h-2.5 fill-current" 
                        style={{ color: `hsl(var(${nodeColor}))` }} 
                      />
                      <span 
                        className="text-sm font-mono"
                        style={{ color: node.isAnonymous ? 'hsl(var(--muted-foreground))' : `hsl(var(${nodeColor}))` }}
                      >
                        {node.isAnonymous ? "•••" : node.label}
                      </span>
                    </div>
                    {nodeIndex < path.nodes.length - 1 && (
                      <ArrowRight 
                        className="w-4 h-4 transition-colors" 
                        style={{ color: 'hsl(var(--score-growth) / 0.5)' }} 
                      />
                    )}
                  </div>
                );
              })}
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
