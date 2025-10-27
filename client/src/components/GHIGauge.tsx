import { Card } from "@/components/ui/card";

interface GHIGaugeProps {
  ghi: number;
  size?: "sm" | "md" | "lg";
}

export function GHIGauge({ ghi, size = "md" }: GHIGaugeProps) {
  const getColor = (value: number) => {
    if (value >= 80) return "text-green-600 dark:text-green-400";
    if (value >= 60) return "text-yellow-600 dark:text-yellow-400";
    if (value >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getGaugeColor = (value: number) => {
    if (value >= 80) return "stroke-green-600 dark:stroke-green-400";
    if (value >= 60) return "stroke-yellow-600 dark:stroke-yellow-400";
    if (value >= 40) return "stroke-orange-600 dark:stroke-orange-400";
    return "stroke-red-600 dark:stroke-red-400";
  };

  const sizeConfig = {
    sm: { width: 120, height: 80, fontSize: "text-2xl", strokeWidth: 8 },
    md: { width: 180, height: 120, fontSize: "text-4xl", strokeWidth: 10 },
    lg: { width: 240, height: 160, fontSize: "text-6xl", strokeWidth: 12 },
  };

  const config = sizeConfig[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const progress = (ghi / 100) * circumference;
  const centerX = config.width / 2;
  const centerY = config.height;

  return (
    <div className="flex flex-col items-center" data-testid="gauge-ghi">
      <div className="relative" style={{ width: config.width, height: config.height }}>
        <svg
          width={config.width}
          height={config.height}
          viewBox={`0 0 ${config.width} ${config.height}`}
          className="overflow-visible"
        >
          <path
            d={`M ${config.strokeWidth / 2} ${centerY} A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${centerY}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            className="text-muted opacity-20"
          />
          
          <path
            d={`M ${config.strokeWidth / 2} ${centerY} A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${centerY}`}
            fill="none"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            className={getGaugeColor(ghi)}
          />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <div className={`font-bold ${config.fontSize} ${getColor(ghi)}`} data-testid="text-ghi-value">
            {ghi}
          </div>
          <div className="text-xs text-muted-foreground font-mono">GHI</div>
        </div>
      </div>
    </div>
  );
}
