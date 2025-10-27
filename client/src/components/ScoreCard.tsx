import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrustLevelBadge, type TrustLevel } from "./TrustLevelBadge";
import { Copy, Download, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScoreCardProps {
  level: TrustLevel;
  sts: number;
  percentile: number;
  minCutSize: number;
  epochTimestamp: string;
  onExportAttestation?: () => void;
}

export function ScoreCard({
  level,
  sts,
  percentile,
  minCutSize,
  epochTimestamp,
  onExportAttestation,
}: ScoreCardProps) {
  const { toast } = useToast();

  const handleExport = () => {
    if (onExportAttestation) {
      onExportAttestation();
    }
    toast({
      title: "Attestation Copied",
      description: "Your trust attestation has been copied to clipboard.",
    });
  };

  return (
    <Card className="p-8 rounded-2xl" data-testid="card-score">
      <CardContent className="p-0 space-y-6">
        <div className="flex items-start justify-between">
          <TrustLevelBadge level={level} />
          <span className="text-xs text-muted-foreground" data-testid="text-epoch-timestamp">
            {new Date(epochTimestamp).toLocaleString()}
          </span>
        </div>

        <div>
          <div className="text-5xl font-bold tracking-tight" data-testid="text-score">
            {sts}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            Standardized Trust Score (0-100)
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2" data-testid="text-percentile">
            <span className="text-sm text-muted-foreground">Percentile:</span>
            <span className="text-lg font-semibold">{percentile}th</span>
          </div>
          <div className="flex items-center gap-2" data-testid="text-mincut">
            <Info className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-medium">{minCutSize}</span>
              <span className="text-muted-foreground"> min-cut</span>
            </span>
          </div>
        </div>

        <Button
          className="w-full gap-2"
          onClick={handleExport}
          data-testid="button-export-attestation"
        >
          <Download className="w-4 h-4" />
          Export Attestation
        </Button>
      </CardContent>
    </Card>
  );
}
