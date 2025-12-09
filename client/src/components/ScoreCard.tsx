import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TierBadge, type Tier } from "./TierBadge";
import { Copy, Download, Info, HelpCircle, QrCode, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { QRCodeDialog } from "./QRCodeDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface CommunityScore {
  communityId: number;
  communityName: string;
  tier: Tier;
  sts: number;
  flow?: number;
  percentile: number;
  minCutSize: number;
  epochTimestamp: string;
  confidence?: {
    percent: number;
    ghi: number;
    localMincutN: number;
  };
}

interface ScoreCardProps {
  // Legacy single-score mode (for backward compatibility)
  tier?: Tier;
  sts?: number;
  flow?: number;
  percentile?: number;
  minCutSize?: number;
  epochTimestamp?: string;
  confidence?: {
    percent: number;
    ghi: number;
    localMincutN: number;
  };
  // Multi-community mode
  communityScores?: CommunityScore[];
  walletAddress?: string;
  onExportAttestation?: () => void;
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
  communityScores,
}: ScoreCardProps) {
  const { toast } = useToast();
  const [showQRCode, setShowQRCode] = useState(false);
  
  // Multi-community mode: find highest score by default
  const highestScore = communityScores && communityScores.length > 0 
    ? communityScores.reduce((max, score) => score.sts > max.sts ? score : max)
    : null;
  
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("");
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize selected community to highest score when data first loads
  useEffect(() => {
    if (highestScore && !hasInitialized) {
      setSelectedCommunityId(String(highestScore.communityId));
      setHasInitialized(true);
    }
  }, [highestScore, hasInitialized]);

  // Get current score to display (either from multi-community or legacy props)
  const currentScore = communityScores && communityScores.length > 0
    ? communityScores.find(s => String(s.communityId) === selectedCommunityId) || highestScore
    : null;

  const displayTier = currentScore?.tier || tier || "Connected";
  const displaySts = currentScore?.sts ?? sts ?? 0;
  const displayFlow = currentScore?.flow ?? flow;
  const displayPercentile = currentScore?.percentile ?? percentile ?? 0;
  const displayMinCut = currentScore?.minCutSize ?? minCutSize ?? 0;
  const displayEpochTimestamp = currentScore?.epochTimestamp || epochTimestamp || new Date().toISOString();
  const displayConfidence = currentScore?.confidence ?? confidence;

  const handleExport = () => {
    if (onExportAttestation) {
      onExportAttestation();
    }
    toast({
      title: "Attestation Copied",
      description: "Your trust attestation has been copied to clipboard.",
    });
  };

  const handleShareVouchLink = () => {
    if (!walletAddress) return;
    
    const vouchUrl = `${window.location.origin}/overview?vouch=${walletAddress}`;
    navigator.clipboard.writeText(vouchUrl);
    
    toast({
      title: "Vouch Link Copied",
      description: "Share this link to make it easy for others to vouch for you!",
    });
  };

  return (
    <Card className="signal-hero p-0 rounded-2xl" data-testid="card-score">
      <CardContent className="p-8 space-y-6">
        {communityScores && communityScores.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Community</label>
            <Select value={selectedCommunityId} onValueChange={setSelectedCommunityId}>
              <SelectTrigger data-testid="select-community-score">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {communityScores.map((score) => (
                  <SelectItem 
                    key={score.communityId} 
                    value={String(score.communityId)}
                  >
                    {score.communityName} (STS: {score.sts})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-start justify-between">
          <TierBadge tier={displayTier} size="lg" />
          <span className="text-xs text-muted-foreground" data-testid="text-epoch-timestamp">
            {new Date(displayEpochTimestamp).toLocaleString()}
          </span>
        </div>

        <div className={displayFlow !== undefined ? "grid grid-cols-2 gap-8" : ""}>
          <div>
            <div 
              className="metric-hero animate-breathe" 
              style={{ color: 'hsl(var(--score-growth))' }}
              data-testid="text-score"
            >
              {displaySts}
            </div>
            <div className="text-sm text-muted-foreground mt-3">
              Network Quality Score {displayFlow === undefined ? "(0-100)" : ""}
            </div>
          </div>
          {displayFlow !== undefined && (
            <div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <div className="metric-secondary" style={{ color: 'hsl(var(--score-river))' }} data-testid="text-flow">
                      {displayFlow.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-3 flex items-center gap-1">
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
              <span className="text-lg font-semibold">{displayPercentile}th</span>
            </div>
            <div className="flex items-center gap-2" data-testid="text-mincut">
              <Info className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                <span className="font-medium">{displayMinCut}</span>
                <span className="text-muted-foreground"> min-cut</span>
              </span>
            </div>
          </div>

          {displayConfidence && (
            <div className="flex items-center justify-between pt-3 border-t">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help" data-testid="text-confidence">
                    <span className="text-sm text-muted-foreground">Confidence:</span>
                    <span className="text-lg font-semibold">{displayConfidence.percent}%</span>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-2">
                    <div className="font-semibold text-sm">Confidence Calculation</div>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Global Health (GHI):</span>
                        <span className="font-mono">{displayConfidence.ghi}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Local Adjustment:</span>
                        <span className="font-mono">{displayConfidence.localMincutN}</span>
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
            <>
              <Button
                size="sm"
                className="gap-2 flex-1"
                onClick={() => setShowQRCode(true)}
                data-testid="button-show-qr"
              >
                <QrCode className="w-4 h-4" />
                Show QR
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 flex-1"
                onClick={handleShareVouchLink}
                data-testid="button-share-link"
              >
                <Share2 className="w-4 h-4" />
                Share Link
              </Button>
            </>
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
