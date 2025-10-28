import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TierBadge, type Tier } from "./TierBadge";
import { Copy, Download, Info, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScoreCardProps {
  tier: Tier;
  sts: number;
  percentile: number;
  minCutSize: number;
  epochTimestamp: string;
  onExportAttestation?: () => void;
  confidence?: {
    percent: number;
    ghi: number;
    localMincutN: number;
  };
}

export function ScoreCard({
  tier,
  sts,
  percentile,
  minCutSize,
  epochTimestamp,
  onExportAttestation,
  confidence,
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
          <TierBadge tier={tier} size="lg" />
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

        <div className="space-y-3">
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

          {confidence && (
            <div className="flex items-center justify-between pt-3 border-t">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help" data-testid="text-confidence">
                    <span className="text-sm text-muted-foreground">Confidence:</span>
                    <span className="text-lg font-semibold">{confidence.percent}%</span>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-2">
                    <div className="font-semibold text-sm">Confidence Calculation</div>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Global Health (GHI):</span>
                        <span className="font-mono">{confidence.ghi}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Local Adjustment:</span>
                        <span className="font-mono">{confidence.localMincutN}</span>
                      </div>
                      <div className="pt-1 border-t">
                        <span className="text-muted-foreground">
                          Formula: GHI × (85% + 15% × local)
                        </span>
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Link href="/why">
            <Button
              variant="outline"
              className="w-full gap-2"
              data-testid="button-why-score"
            >
              <HelpCircle className="w-4 h-4" />
              Why this score?
            </Button>
          </Link>
          <Button
            className="w-full gap-2"
            onClick={handleExport}
            data-testid="button-export-attestation"
          >
            <Download className="w-4 h-4" />
            Export Attestation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
