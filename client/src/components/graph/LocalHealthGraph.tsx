import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import { ForceGraph3DWrapper } from "./ForceGraph3DWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ZoomIn, ZoomOut, Maximize2, Network } from "lucide-react";

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
  height?: number | string;
  heroMode?: boolean;
}

export function LocalHealthGraph({ 
  limit = 500, 
  communityId = 0,
  height = 600,
  heroMode = false
}: LocalHealthGraphProps) {
  const graphRef = useRef<any>();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [showFullNetwork, setShowFullNetwork] = useState(false);
  const [themeVersion, setThemeVersion] = useState(0);

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

  const actualLimit = showFullNetwork ? 10000 : limit;

  const { data, isLoading } = useQuery<GraphData>({
    queryKey: [`/api/graph/local-health?limit=${actualLimit}&communityId=${communityId}`],
  });

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

  const scoreRange = useMemo(() => {
    if (!data || data.nodes.length === 0) {
      return { min: 0, max: 100 };
    }
    const scores = data.nodes.map(n => n.localHealth);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    return { min, max: max > min ? max : min + 1 };
  }, [data]);

  const getNodeColor = useCallback((node: GraphNode) => {
    const score = node.localHealth;
    const { min, max } = scoreRange;
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

  const getNodeSize = useCallback((node: GraphNode) => {
    const baseSize = 1;
    const maxSize = 6;
    const { min, max } = scoreRange;
    const normalizedScore = (node.localHealth - min) / (max - min);
    return baseSize + (normalizedScore * (maxSize - baseSize));
  }, [scoreRange]);

  const nodeScoreMap = useMemo(() => {
    const map = new Map<string, number>();
    if (data?.nodes) {
      data.nodes.forEach(node => {
        map.set(node.id, node.localHealth);
      });
    }
    return map;
  }, [data?.nodes]);

  const getLinkWidth = useCallback((link: any) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const sourceScore = nodeScoreMap.get(sourceId) || scoreRange.min;
    const { min, max } = scoreRange;
    const normalizedScore = (sourceScore - min) / (max - min);
    const minWidth = 0.5;
    const maxWidth = 3;
    return minWidth + normalizedScore * (maxWidth - minWidth);
  }, [nodeScoreMap, scoreRange]);

  const getLinkColor = useCallback((link: any) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const sourceScore = nodeScoreMap.get(sourceId) || scoreRange.min;
    const { min, max } = scoreRange;
    const normalizedScore = (sourceScore - min) / (max - min);
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

  const heightValue = typeof height === 'string' ? height : `${height}px`;
  const containerHeight = typeof height === 'string' ? height : undefined;
  const fallbackHeight = 600;
  
  const [computedNumericHeight, setComputedNumericHeight] = useState<number>(() => {
    if (typeof height === 'number') return height;
    if (typeof height === 'string' && height.endsWith('vh')) {
      const vh = parseFloat(height);
      return Math.floor((window.innerHeight * vh) / 100);
    }
    return fallbackHeight;
  });

  useEffect(() => {
    if (typeof height === 'string' && height.endsWith('vh')) {
      const updateHeight = () => {
        const vh = parseFloat(height);
        setComputedNumericHeight(Math.floor((window.innerHeight * vh) / 100));
      };
      updateHeight();
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    } else if (typeof height === 'number') {
      setComputedNumericHeight(height);
    }
  }, [height]);

  const numericHeight = computedNumericHeight;

  const activeNode = hoveredNode || selectedNode;

  if (heroMode) {
    if (isLoading) {
      return (
        <Card className="overflow-hidden" data-testid="card-graph-loading">
          <CardContent className="p-0">
            <div className="relative" style={{ height: heightValue }}>
              <Skeleton className="w-full h-full" />
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!data || data.nodes.length === 0) {
      return (
        <Card className="overflow-hidden" data-testid="card-graph-empty">
          <CardContent className="p-0">
            <div 
              className="flex flex-col items-center justify-center text-muted-foreground gap-4" 
              style={{ height: heightValue }}
            >
              <Network className="w-16 h-16 opacity-50" />
              <div className="text-center">
                <p className="text-lg font-medium">No Network Data</p>
                <p className="text-sm">Start by creating endorsements to build your trust network</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="overflow-hidden" data-testid="container-graph">
        <CardContent className="p-0 relative" style={{ height: heightValue }}>
          {/* Floating Controls - Top Right */}
          <div className="absolute top-4 right-4 z-10 flex gap-2 items-center">
            <div className="flex gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 border">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => graphRef.current?.zoomToFit(400)}
                data-testid="button-zoom-fit"
                className="h-8 w-8"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  const fg = graphRef.current;
                  if (fg) {
                    const currentPos = fg.cameraPosition();
                    fg.cameraPosition({ z: currentPos.z * 0.8 }, undefined, 300);
                  }
                }}
                data-testid="button-zoom-in"
                className="h-8 w-8"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  const fg = graphRef.current;
                  if (fg) {
                    const currentPos = fg.cameraPosition();
                    fg.cameraPosition({ z: currentPos.z * 1.2 }, undefined, 300);
                  }
                }}
                data-testid="button-zoom-out"
                className="h-8 w-8"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>
            <Button
              size="sm"
              variant={showFullNetwork ? "default" : "outline"}
              onClick={() => setShowFullNetwork(!showFullNetwork)}
              data-testid="button-toggle-full-network"
              className="bg-background/80 backdrop-blur-sm"
            >
              {showFullNetwork ? "Sample" : "Full Network"}
            </Button>
          </div>

          {/* Graph Stats - Top Left */}
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 border">
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nodes: </span>
                  <span className="font-bold">{graphData.nodes.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Edges: </span>
                  <span className="font-bold">{graphData.links.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Score Range: </span>
                  <span className="font-bold">{scoreRange.min.toFixed(0)}-{scoreRange.max.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Selected/Hovered Node Details - Bottom Left */}
          {activeNode && (
            <div className="absolute bottom-4 left-4 z-10">
              <Card className="w-64 bg-background/95 backdrop-blur-sm" data-testid="card-node-details">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {hoveredNode ? 'Hovering' : 'Selected'}
                    <Badge variant="outline" className="ml-auto">
                      {activeNode.localHealth.toFixed(1)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-4 space-y-2">
                  <div className="font-mono text-xs break-all text-muted-foreground">
                    {activeNode.address}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Edges</div>
                      <div className="font-bold">{activeNode.degree}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Vouchers</div>
                      <div className="font-bold">{activeNode.voucherCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Strength</div>
                      <div className="font-bold">{(activeNode.avgVoucherStrength * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Legend - Bottom Right */}
          <div className="absolute bottom-4 right-4 z-10">
            <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 border">
              <div className="text-xs text-muted-foreground mb-2">LocalHealth Score</div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${themeColors.destructive[0]} ${themeColors.destructive[1]} ${Math.min(100, parseInt(themeColors.destructive[2]) + 30)}%)` }} />
                <span className="text-xs mr-2">0-20</span>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${themeColors.muted[0]} ${themeColors.muted[1]} ${themeColors.muted[2]})` }} />
                <span className="text-xs mr-2">20-40</span>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${themeColors.accent[0]} ${themeColors.accent[1]} ${themeColors.accent[2]})` }} />
                <span className="text-xs mr-2">40-60</span>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${themeColors.primary[0]} ${themeColors.primary[1]} ${Math.min(100, parseInt(themeColors.primary[2]) + 20)}%)` }} />
                <span className="text-xs mr-2">60-80</span>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${themeColors.primary[0]} ${themeColors.primary[1]} ${themeColors.primary[2]})` }} />
                <span className="text-xs">80+</span>
              </div>
            </div>
          </div>

          {/* The Graph */}
          <ForceGraph3DWrapper
            graphRef={graphRef}
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
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={0.9}
            linkDirectionalArrowColor={getLinkColor}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            enableNodeDrag={true}
            cooldownTicks={100}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            width={undefined}
            height={numericHeight}
            containerHeight={containerHeight}
            fallbackHeight={fallbackHeight}
            backgroundColor="rgba(0,0,0,0)"
            showNavInfo={false}
          />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card data-testid="card-graph-loading">
        <CardHeader>
          <CardTitle>LocalHealth Network</CardTitle>
          <CardDescription>Loading network graph...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height: heightValue }} />
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
          <div className="flex items-center justify-center text-muted-foreground" style={{ height: heightValue }}>
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
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
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
                  if (fg) {
                    const currentPos = fg.cameraPosition();
                    fg.cameraPosition({ z: currentPos.z * 0.8 }, undefined, 300);
                  }
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
                  if (fg) {
                    const currentPos = fg.cameraPosition();
                    fg.cameraPosition({ z: currentPos.z * 1.2 }, undefined, 300);
                  }
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
          <ForceGraph3DWrapper
            graphRef={graphRef}
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
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={0.9}
            linkDirectionalArrowColor={getLinkColor}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            enableNodeDrag={true}
            cooldownTicks={100}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            width={undefined}
            height={numericHeight}
            containerHeight={containerHeight}
            fallbackHeight={fallbackHeight}
            backgroundColor="rgba(0,0,0,0)"
            showNavInfo={false}
          />
        </CardContent>
      </Card>

      {activeNode && (
        <Card className="w-full lg:w-80 h-fit" data-testid="card-node-details">
          <CardHeader>
            <CardTitle className="text-base">
              {hoveredNode ? 'Hovering' : 'Selected'} Node
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Address</div>
              <div className="font-mono text-xs break-all" data-testid="text-node-address">
                {activeNode.address}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">LocalHealth</div>
                <Badge variant="outline" data-testid="badge-local-health">
                  {activeNode.localHealth.toFixed(1)}
                </Badge>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Endorsements</div>
                <Badge variant="outline" data-testid="badge-endorsements">
                  {activeNode.degree}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Vouchers</div>
                <div className="text-sm" data-testid="text-voucher-count">
                  {activeNode.voucherCount}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Avg Strength</div>
                <div className="text-sm" data-testid="text-avg-strength">
                  {(activeNode.avgVoucherStrength * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
