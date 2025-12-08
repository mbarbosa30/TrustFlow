import { useEffect, useState, useRef, Component, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class GraphErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface WrapperProps {
  graphRef?: React.RefObject<any>;
  height?: number;
  containerHeight?: string;
  fallbackHeight?: number;
  [key: string]: any;
}

export function ForceGraph3DWrapper({ graphRef, height, containerHeight, fallbackHeight = 600, ...props }: WrapperProps) {
  const [ForceGraph3D, setForceGraph3D] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [computedHeight, setComputedHeight] = useState<number>(height || fallbackHeight);
  const internalRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = graphRef || internalRef;
  const lastValidHeight = useRef<number>(height || fallbackHeight);

  useEffect(() => {
    let mounted = true;
    
    import("react-force-graph-3d")
      .then((mod) => {
        if (mounted) {
          setForceGraph3D(() => mod.default);
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error("Failed to load 3D graph:", err);
          setLoadError("3D visualization unavailable");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!containerHeight || !containerRef.current) {
      if (height) {
        setComputedHeight(height);
        lastValidHeight.current = height;
      }
      return;
    }

    let rafId: number;
    
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.height > 50) {
          const newHeight = Math.floor(rect.height);
          lastValidHeight.current = newHeight;
          setComputedHeight(newHeight);
        } else if (lastValidHeight.current > 0) {
          setComputedHeight(lastValidHeight.current);
        }
      }
    };

    const debouncedUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(debouncedUpdate);
    resizeObserver.observe(containerRef.current);

    window.addEventListener('resize', debouncedUpdate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', debouncedUpdate);
    };
  }, [containerHeight, height]);

  const heightStyle = containerHeight || (height ? `${height}px` : '600px');

  if (loadError) {
    return (
      <div 
        ref={containerRef}
        className="flex flex-col items-center justify-center text-muted-foreground gap-2" 
        style={{ height: heightStyle }}
      >
        <AlertCircle className="h-8 w-8" />
        <p>{loadError}</p>
      </div>
    );
  }

  if (!ForceGraph3D) {
    return (
      <div ref={containerRef} style={{ height: heightStyle }}>
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ height: heightStyle }}>
      <GraphErrorBoundary
        fallback={
          <div 
            className="flex flex-col items-center justify-center text-muted-foreground gap-2 h-full"
          >
            <AlertCircle className="h-8 w-8" />
            <p>3D visualization encountered an error</p>
          </div>
        }
      >
        <ForceGraph3D ref={ref} height={computedHeight} {...props} />
      </GraphErrorBoundary>
    </div>
  );
}
