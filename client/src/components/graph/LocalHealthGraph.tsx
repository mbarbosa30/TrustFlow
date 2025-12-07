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
  voucherCount: number;
  avgVoucherStrength: number;
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

  // Calculate actual score range from data for auto-scaling
  const scoreRange = useMemo(() => {
    if (!data || data.nodes.length === 0) {
      return { min: 0, max: 100 };
    }
    const scores = data.nodes.map(n => n.localHealth);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    // Ensure we have some range to work with
    return { min, max: max > min ? max : min + 1 };
  }, [data]);

  // Color scale based on LocalHealth score (auto-scaled to actual data range)
  const getNodeColor = useCallback((node: GraphNode) => {
    const score = node.localHealth;
    const { min, max } = scoreRange;
    
    // Normalize score to 0-100 range based on actual data
    const normalizedScore = ((score - min) / (max - min)) * 100;
    
    if (normalizedScore >= 80) {
      const hsl = themeColors.primary;
      return `hsl(${hsl[0]} ${hsl[1]} ${hsl[2]})`;
    } else if (normalizedScore >= 60) {
      const hsl = themeColors.primary;
      return `hsl(${hsl[0]} ${hsl[1]} ${Math.min(100, parseInt(hsl[2]) + 20)}%)`;
    } else if (normalizedScore >= 40) {
      const hsl = themeColors.accent;
      return `hsl(${hsl[0]} ${hsl[1]} ${hsl[2]})`;
    } else if (normalizedScore >= 20) {
      const hsl = themeColors.muted;
      return `hsl(${hsl[0]} ${hsl[1]} ${hsl[2]})`;
    } else {
      const hsl = themeColors.destructive;
      return `hsl(${hsl[0]} ${hsl[1]} ${Math.min(100, parseInt(hsl[2]) + 30)}%)`;
    }
  }, [themeColors, scoreRange]);

  // Node size based on LocalHealth score (auto-scaled for 3D, smaller overall)
  const getNodeSize = useCallback((node: GraphNode) => {
    const baseSize = 1;
    const maxSize = 6;
    const { min, max } = scoreRange;
    
    // Normalize score to 0-1 based on actual data range
    const normalizedScore = (node.localHealth - min) / (max - min);
    
    // Use linear scaling for more dramatic visual difference in 3D
    return baseSize + (normalizedScore * (maxSize - baseSize));
  }, [scoreRange]);

  // Create a map of node IDs to LocalHealth scores for edge strength calculation
  const nodeScoreMap = useMemo(() => {
    const map = new Map<string, number>();
    if (data?.nodes) {
      data.nodes.forEach(node => {
        map.set(node.id, node.localHealth);
      });
    }
    return map;
  }, [data?.nodes]);

  // Link width based on source node's LocalHealth (voucher strength, auto-scaled)
  const getLinkWidth = useCallback((link: any) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const sourceScore = nodeScoreMap.get(sourceId) || scoreRange.min;
    const { min, max } = scoreRange;
    
    // Normalize to 0-1 based on actual data range
    const normalizedScore = (sourceScore - min) / (max - min);
    
    // Map normalized score to width (0.5-3)
    const minWidth = 0.5;
    const maxWidth = 3;
    return minWidth + normalizedScore * (maxWidth - minWidth);
  }, [nodeScoreMap, scoreRange]);

  // Link color with opacity based on source node's LocalHealth (auto-scaled)
  const getLinkColor = useCallback((link: any) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const sourceScore = nodeScoreMap.get(sourceId) || scoreRange.min;
    const { min, max } = scoreRange;
    
    // Normalize to 0-1 based on actual data range
    const normalizedScore = (sourceScore - min) / (max - min);
    
    // Map normalized score to opacity (0.2-0.8)
    const minOpacity = 0.2;
    const maxOpacity = 0.8;
    const opacity = minOpacity + normalizedScore * (maxOpacity - minOpacity);
    
    const hsl = themeColors.border;
    return `hsl(${hsl[0]} ${hsl[1]} ${hsl[2]} / ${opacity})`;
  }, [themeColors, nodeScoreMap, scoreRange]);

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
              linkWidth={getLinkWidth}
              linkDirectionalArrowLength={6}
              linkDirectionalArrowRelPos={0.9}
              onNodeClick={handleNodeClick}
              onNodeHover={handleNodeHover}
              enableNodeDrag={true}
              cooldownTicks={100}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              width={undefined}
              height={height}
              backgroundColor="rgba(0,0,0,0)"
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
                      <div className="text-xs text-muted-foreground mb-1">Vouchers</div>
                      <div className="text-sm" data-testid="text-voucher-count">
                        {node.voucherCount}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Avg Strength</div>
                      <div className="text-sm" data-testid="text-avg-strength">
                        {(node.avgVoucherStrength * 100).toFixed(1)}%
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
