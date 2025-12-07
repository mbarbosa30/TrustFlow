import ForceGraph2D from "react-force-graph-2d";

interface WrapperProps {
  graphRef?: React.RefObject<any>;
  height: number;
  [key: string]: any;
}

export function ForceGraph3DWrapper({ graphRef, height, ...props }: WrapperProps) {
  return (
    <ForceGraph2D 
      ref={graphRef} 
      height={height} 
      {...props} 
    />
  );
}
