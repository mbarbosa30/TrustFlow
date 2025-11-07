import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, Network } from "lucide-react";

interface EgoContext {
  id: number;
  contextType: 'ego';
  ownerAddress: string;
  communityId: number | null;
  policyJson: any;
  createdAt: string;
}

interface EgoContextResponse {
  context: EgoContext;
  coSeeds: any[];
  seedAddresses: string[];
}

interface EgoScoreResponse {
  ownerAddress: string;
  localHealth: number;
  seedAddresses: string[];
  metrics: {
    totalNodes: number;
    acceptedUsers: number;
    avgResidualFlow: number;
    medianMinCut: number;
    maxPossibleFlow: number;
  };
  nodeDetails: Array<{
    address: string;
    distance: number;
    capacity: number;
    flow: number;
    residualFlow: number;
    minCut: number;
  }>;
}

export default function MyNetwork() {
  const { address } = useAccount();
  const { t } = useLanguage();

  // Fetch ego context
  const { data: egoData, isLoading } = useQuery<EgoContextResponse>({
    queryKey: ['/api/ego', address?.toLowerCase(), 'context'],
    enabled: !!address,
  });

  // Fetch ego score
  const { data: scoreData, isLoading: isLoadingScore } = useQuery<EgoScoreResponse>({
    queryKey: ['/api/ego', address?.toLowerCase(), 'score'],
    enabled: !!address,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (!address) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Alert data-testid="alert-connect-wallet">
          <Info className="h-4 w-4" />
          <AlertDescription data-testid="text-connect-wallet-message">
            Connect your wallet to view your personal network graph.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-my-network">
          My Network
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Your personal network graph - endorsement edges create signals computed by max-flow algorithms
        </p>
      </div>

      {/* Personal Health Card */}
      <Card className="mb-6" data-testid="card-personal-health">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            <span data-testid="text-card-title-health">Personal Network Quality</span>
          </CardTitle>
          <CardDescription data-testid="text-card-description-health">
            Your LocalHealth signal computed from incoming endorsement edges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {isLoadingScore ? (
                <Skeleton className="h-16 w-24 mb-2" />
              ) : (
                <div className="text-5xl font-bold mb-2" data-testid="text-health-score">
                  {scoreData?.localHealth !== undefined ? scoreData.localHealth.toFixed(1) : '—'}
                </div>
              )}
              <p className="text-sm text-muted-foreground" data-testid="text-health-score-label">
                LocalHealth (0-100)
              </p>
            </div>
            <div className="text-right">
              <Badge 
                variant={scoreData && scoreData.localHealth > 50 ? "default" : "secondary"} 
                className="mb-2" 
                data-testid="badge-status"
              >
                {scoreData && scoreData.localHealth > 0 ? "Active" : "Building Network"}
              </Badge>
              <p className="text-sm text-muted-foreground" data-testid="text-status-message">
                {scoreData && scoreData.metrics.totalNodes > 0 
                  ? `${scoreData.metrics.totalNodes} nodes in network` 
                  : "Get vouched to build your score"}
              </p>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              {isLoadingScore ? (
                <Skeleton className="h-8 w-12 mx-auto" />
              ) : (
                <div className="text-2xl font-semibold" data-testid="text-accepted-users">
                  {scoreData?.metrics.acceptedUsers ?? 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground" data-testid="text-label-accepted">Accepted Users</p>
            </div>
            <div>
              {isLoadingScore ? (
                <Skeleton className="h-8 w-16 mx-auto" />
              ) : (
                <div className="text-2xl font-semibold" data-testid="text-avg-flow">
                  {scoreData?.metrics.avgResidualFlow !== undefined 
                    ? scoreData.metrics.avgResidualFlow.toFixed(3) 
                    : '—'}
                </div>
              )}
              <p className="text-xs text-muted-foreground" data-testid="text-label-avg-flow">Avg Residual Flow</p>
            </div>
            <div>
              {isLoadingScore ? (
                <Skeleton className="h-8 w-12 mx-auto" />
              ) : (
                <div className="text-2xl font-semibold" data-testid="text-median-cut">
                  {scoreData?.metrics.medianMinCut !== undefined 
                    ? scoreData.metrics.medianMinCut.toFixed(2) 
                    : '—'}
                </div>
              )}
              <p className="text-xs text-muted-foreground" data-testid="text-label-median-cut">Median Min-Cut</p>
            </div>
          </div>

          {scoreData && scoreData.metrics.totalNodes === 0 && (
            <Alert className="mt-6" data-testid="alert-scoring-info">
              <Info className="h-4 w-4" />
              <AlertDescription data-testid="text-scoring-info-message">
                Your score starts at 0. Receive endorsements from others to increase your LocalHealth signal through the recursive trust algorithm.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* How It Works Card */}
      <Card data-testid="card-how-it-works">
        <CardHeader>
          <CardTitle data-testid="text-how-it-works-title">How Personal Networks Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2" data-testid="text-section-title-ego">🌐 Ego-Centric Graph</h4>
            <p className="text-sm text-muted-foreground" data-testid="text-section-description-ego">
              Your network is centered on incoming vouches that are weighted by voucher strength. The iterative algorithm
              computes your score based on both the quantity and quality of endorsements.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2" data-testid="text-section-title-vouches">🔄 Global Endorsements</h4>
            <p className="text-sm text-muted-foreground" data-testid="text-section-description-vouches">
              Create global endorsements that become edges in the graph. These endorsement edges flow across all personal networks,
              not just specific communities, creating neutral signals.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2" data-testid="text-section-title-score">📊 LocalHealth Signal</h4>
            <p className="text-sm text-muted-foreground" data-testid="text-section-description-score">
              Your network quality (0-100) is computed using an iterative algorithm where vouches are weighted by voucher strength.
              Strong vouchers contribute more than weak ones. Formula: 60% flow + 40% redundancy, with dilution penalty for vouching {'>'}10 people.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2" data-testid="text-section-title-capacity">🔄 Recursive Weighting</h4>
            <p className="text-sm text-muted-foreground" data-testid="text-section-description-capacity">
              Vouches are weighted by the voucher's LocalHealth score (capacity = voucherScore / 100).
              Scores converge through iteration, creating true recursive trust propagation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
