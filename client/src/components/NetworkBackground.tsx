import { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

interface Edge {
  from: number;
  to: number;
  opacity: number;
  flowOffset: number;
  flowSpeed: number;
}

export function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const nodeCount = 24;
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: 4 + Math.random() * 5,
        opacity: 0.4 + Math.random() * 0.3,
      });
    }

    const connectionDistance = Math.min(canvas.width, canvas.height) * 0.25;
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < connectionDistance && Math.random() > 0.4) {
          edges.push({
            from: i,
            to: j,
            opacity: 0.25 + Math.random() * 0.2,
            flowOffset: Math.random() * 100,
            flowSpeed: 0.4 + Math.random() * 0.5,
          });
        }
      }
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;

    let time = 0;

    const animate = () => {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.016;

      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        node.x = Math.max(0, Math.min(canvas.width, node.x));
        node.y = Math.max(0, Math.min(canvas.height, node.y));
      }

      for (const edge of edges) {
        const fromNode = nodes[edge.from];
        const toNode = nodes[edge.to];
        
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > connectionDistance * 1.5) continue;

        const fadeOpacity = edge.opacity * Math.max(0, 1 - dist / (connectionDistance * 1.5));

        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = `hsla(200, 65%, 55%, ${fadeOpacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const flowPos = ((time * edge.flowSpeed + edge.flowOffset) % 1);
        const pulseX = fromNode.x + dx * flowPos;
        const pulseY = fromNode.y + dy * flowPos;
        
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(200, 75%, 65%, ${fadeOpacity * 2})`;
        ctx.fill();
      }

      for (const node of nodes) {
        const pulse = 1 + 0.15 * Math.sin(time * 2 + node.x * 0.01);
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(200, 60%, 55%, ${node.opacity})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * pulse * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(200, 65%, 70%, ${node.opacity * 0.8})`;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 1 }}
      data-testid="canvas-network-background"
    />
  );
}
