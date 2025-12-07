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
  height: number;
  [key: string]: any;
}

export function ForceGraph3DWrapper({ graphRef, height, ...props }: WrapperProps) {
  const [ForceGraph3D, setForceGraph3D] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const internalRef = useRef<any>();
  const ref = graphRef || internalRef;

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

  if (loadError) {
    return (
      <div 
        className="flex flex-col items-center justify-center text-muted-foreground gap-2" 
        style={{ height: `${height}px` }}
      >
        <AlertCircle className="h-8 w-8" />
        <p>{loadError}</p>
      </div>
    );
  }

  if (!ForceGraph3D) {
    return <Skeleton className="w-full" style={{ height: `${height}px` }} />;
  }

  return (
    <GraphErrorBoundary
      fallback={
        <div 
          className="flex flex-col items-center justify-center text-muted-foreground gap-2" 
          style={{ height: `${height}px` }}
        >
          <AlertCircle className="h-8 w-8" />
          <p>3D visualization encountered an error</p>
        </div>
      }
    >
      <ForceGraph3D ref={ref} height={height} {...props} />
    </GraphErrorBoundary>
  );
}
