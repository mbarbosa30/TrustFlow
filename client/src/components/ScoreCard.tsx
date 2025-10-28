import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TierBadge, type Tier } from "./TierBadge";
import { Copy, Download, Info, HelpCircle, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useState } from "react";
import { QRCodeDialog } from "./QRCodeDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScoreCardProps {
  tier: Tier;
  sts: number;
  flow?: number;
  percentile: number;
  minCutSize: number;
  epochTimestamp: string;
  walletAddress?: string;
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
  flow,
  percentile,
  minCutSize,
  epochTimestamp,
  walletAddress,
  onExportAttestation,
  confidence,
}: ScoreCardProps) {
  const { toast } = useToast();
  const [showQRCode, setShowQRCode] = useState(false);

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

        <div className={flow !== undefined ? "grid grid-cols-2 gap-6" : ""}>
          <div>
            <div className="text-5xl font-bold tracking-tight" data-testid="text-score">
              {sts}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Standardized Trust Score {flow === undefined ? "(0-100)" : ""}
            </div>
          </div>
          {flow !== undefined && (
            <div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <div className="text-5xl font-bold tracking-tight text-primary" data-testid="text-flow">
                      {flow.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                      Raw Flow
                      <Info className="w-3 h-3" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-2">
                    <div className="font-semibold text-sm">Raw Flow Value</div>
                    <div className="text-xs text-muted-foreground">
                      The actual max-flow capacity from seed nodes to you, measured in units.
                      This is the "honest" algorithm output before standardization to 0-100.
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
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

        <div className="flex flex-wrap gap-2">
          {walletAddress && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 flex-1"
              onClick={() => setShowQRCode(true)}
              data-testid="button-show-qr"
            >
              <QrCode className="w-4 h-4" />
              Show QR
            </Button>
          )}
          <Link href="/why" className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              data-testid="button-why-score"
            >
              <HelpCircle className="w-4 h-4" />
              Why?
            </Button>
          </Link>
          <Button
            size="sm"
            className="gap-2 flex-1"
            onClick={handleExport}
            data-testid="button-export-attestation"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </CardContent>

      {walletAddress && (
        <QRCodeDialog
          open={showQRCode}
          onOpenChange={setShowQRCode}
          address={walletAddress}
        />
      )}
    </Card>
  );
}
