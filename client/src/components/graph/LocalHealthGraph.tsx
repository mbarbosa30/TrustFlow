import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface GraphNode {
  id: string;
  address: string;
  localHealth: number;
  degree: number;
  flowScore: number;
  redundancyScore: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface LocalHealthGraphProps {
  limit?: number;
  communityId?: number;
  height?: number;
}

export function LocalHealthGraph({ 
  limit = 50, 
  communityId = 0,
  height = 600 
}: LocalHealthGraphProps) {
  const graphRef = useRef<any>();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [showFullNetwork, setShowFullNetwork] = useState(false);
  const [themeVersion, setThemeVersion] = useState(0);

  // Watch for theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setThemeVersion((v) => v + 1);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Determine actual limit based on full network toggle
  const actualLimit = showFullNetwork ? 200 : limit;

  const { data, isLoading } = useQuery<GraphData>({
    queryKey: [`/api/graph/local-health?limit=${actualLimit}&communityId=${communityId}`],
  });

  // Memoize theme colors, recompute when theme changes
  const themeColors = useMemo(() => {
    const rootStyles = getComputedStyle(document.documentElement);
    return {
      primary: rootStyles.getPropertyValue('--primary').trim().split(' '),
      accent: rootStyles.getPropertyValue('--accent-foreground').trim().split(' '),
      muted: rootStyles.getPropertyValue('--muted-foreground').trim().split(' '),
      destructive: rootStyles.getPropertyValue('--destructive').trim().split(' '),
      border: rootStyles.getPropertyValue('--border').trim().split(' '),
    };
  }, [themeVersion]);

  // Color scale based on LocalHealth score (0-100)
  const getNodeColor = useCallback((node: GraphNode) => {
    const score = node.localHealth;
    
    if (score >= 80) {
      const hsl = themeColors.primary;
      return `hsl(${hsl[0]} ${hsl[1]} ${hsl[2]})`;
    } else if (score >= 60) {
      const hsl = themeColors.primary;
      return `hsl(${hsl[0]} ${hsl[1]} ${Math.min(100, parseInt(hsl[2]) + 20)}%)`;
    } else if (score >= 40) {
      const hsl = themeColors.accent;
      return `hsl(${hsl[0]} ${hsl[1]} ${hsl[2]})`;
    } else if (score >= 20) {
      const hsl = themeColors.muted;
      return `hsl(${hsl[0]} ${hsl[1]} ${hsl[2]})`;
    } else {
      const hsl = themeColors.destructive;
      return `hsl(${hsl[0]} ${hsl[1]} ${Math.min(100, parseInt(hsl[2]) + 30)}%)`;
    }
  }, [themeColors]);

  // Node size based on LocalHealth score
  const getNodeSize = useCallback((node: GraphNode) => {
    const baseSize = 3;
    const scoreMultiplier = Math.sqrt(node.localHealth / 100);
    return baseSize + (scoreMultiplier * 5);
  }, []);

  // Link color (memoized)
  const linkColor = useMemo(() => {
    const hsl = themeColors.border;
    return `hsl(${hsl[0]} ${hsl[1]} ${hsl[2]} / 0.3)`;
  }, [themeColors]);

  const getLinkColor = useCallback(() => linkColor, [linkColor]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node);
  }, []);

  const graphData = useMemo(() => data || { nodes: [], links: [] }, [data]);

  if (isLoading) {
    return (
      <Card data-testid="card-graph-loading">
        <CardHeader>
          <CardTitle>LocalHealth Network</CardTitle>
          <CardDescription>Loading network graph...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height: `${height}px` }} />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <Card data-testid="card-graph-empty">
        <CardHeader>
          <CardTitle>LocalHealth Network</CardTitle>
          <CardDescription>No network data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center text-muted-foreground" style={{ height: `${height}px` }}>
            No endorsement data to visualize
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex gap-4 flex-col lg:flex-row" data-testid="container-graph">
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle>LocalHealth Network</CardTitle>
              <CardDescription>
                Interactive force-directed graph showing {graphData.nodes.length} users and {graphData.links.length} endorsements
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => graphRef.current?.zoomToFit(400)}
                data-testid="button-zoom-fit"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  const fg = graphRef.current;
                  if (fg) fg.zoom(fg.zoom() * 1.2);
                }}
                data-testid="button-zoom-in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  const fg = graphRef.current;
                  if (fg) fg.zoom(fg.zoom() * 0.8);
                }}
                data-testid="button-zoom-out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={showFullNetwork ? "default" : "outline"}
                onClick={() => setShowFullNetwork(!showFullNetwork)}
                data-testid="button-toggle-full-network"
              >
                {showFullNetwork ? "Show Sample" : "Full Network"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative" style={{ height: `${height}px` }}>
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              nodeId="id"
              nodeLabel={(node: any) => {
                const n = node as GraphNode;
                return `${n.address.slice(0, 6)}...${n.address.slice(-4)}\nLocalHealth: ${n.localHealth.toFixed(1)}\nEndorsements: ${n.degree}`;
              }}
              nodeColor={getNodeColor}
              nodeVal={getNodeSize}
              linkColor={getLinkColor}
              linkWidth={1}
              linkDirectionalArrowLength={3}
              linkDirectionalArrowRelPos={1}
              onNodeClick={handleNodeClick}
              onNodeHover={handleNodeHover}
              enableNodeDrag={true}
              cooldownTicks={100}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              width={undefined}
              height={height}
              backgroundColor="transparent"
            />
          </div>
        </CardContent>
      </Card>

      {(selectedNode || hoveredNode) && (
        <Card className="w-full lg:w-80 h-fit" data-testid="card-node-details">
          <CardHeader>
            <CardTitle className="text-base">
              {hoveredNode ? 'Hovering' : 'Selected'} Node
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const node = hoveredNode || selectedNode;
              if (!node) return null;

              return (
                <>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Address</div>
                    <div className="font-mono text-xs break-all" data-testid="text-node-address">
                      {node.address}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">LocalHealth</div>
                      <Badge variant="outline" data-testid="badge-local-health">
                        {node.localHealth.toFixed(1)}
                      </Badge>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Endorsements</div>
                      <Badge variant="outline" data-testid="badge-endorsements">
                        {node.degree}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Flow Score</div>
                      <div className="text-sm" data-testid="text-flow-score">
                        {node.flowScore.toFixed(1)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Redundancy</div>
                      <div className="text-sm" data-testid="text-redundancy-score">
                        {node.redundancyScore.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
