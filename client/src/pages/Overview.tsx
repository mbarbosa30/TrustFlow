import { EndorseForm } from "@/components/EndorseForm";
import { EndorsementsList } from "@/components/EndorsementsList";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Download, Share2, CreditCard, DollarSign, Settings, Coins, ChevronRight } from "lucide-react";
import { useWallet } from '@/hooks/useWallet';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef } from "react";
import { QRCodeDialog } from "@/components/QRCodeDialog";
import type { PublicEndorsement } from "@shared/schema";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Overview() {
  const { address, isConnected } = useWallet();
  const [showQRCode, setShowQRCode] = useState(false);
  const [location] = useLocation();
  const endorseFormRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const urlParams = new URLSearchParams(window.location.search);
  const vouchAddress = urlParams.get('vouch');

  const { data: scoreData, isLoading: isLoadingScore } = useQuery<{
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
  }>({
    queryKey: ['/api/ego', address?.toLowerCase(), 'score'],
    enabled: isConnected && !!address,
  });

  const { data: givenEndorsementsData, isLoading: isLoadingGiven } = useQuery<{ endorsements: PublicEndorsement[] }>({
    queryKey: [`/api/endorsements?endorser=${address}`],
    enabled: isConnected && !!address,
  });

  const { data: receivedEndorsementsData, isLoading: isLoadingReceived } = useQuery<{ endorsements: PublicEndorsement[] }>({
    queryKey: [`/api/endorsements?endorsee=${address}`],
    enabled: isConnected && !!address,
  });

  // User's communities (for membership and seed/manager status)
  const { data: userCommunitiesData } = useQuery<{ communities: any[] }>({
    queryKey: ['/api/communities/user', address],
    enabled: isConnected && !!address,
  });

  const userCommunities = userCommunitiesData?.communities || [];
  const firstCommunity = userCommunities[0];
  const isManager = userCommunities.some((c: any) => 
    c.seedAddresses?.includes(address?.toLowerCase())
  );

  // User's active loans (for borrower actions) - fetch from first community
  const { data: userLoansData } = useQuery<{ loans: any[] }>({
    queryKey: [`/api/loans/borrower/${firstCommunity?.id}/${address}`],
    enabled: isConnected && !!address && !!firstCommunity,
  });

  // KUDOS balance
  const { data: kudosData } = useQuery<{ balance: number; lastClaimedAt: string | null; canClaim: boolean }>({
    queryKey: ['/api/kudos/balance', address],
    enabled: isConnected && !!address,
  });

  const activeLoans = userLoansData?.loans?.filter((loan: any) => loan.status === 'ACTIVE') || [];

  const givenEndorsements = givenEndorsementsData?.endorsements.map(e => ({
    id: e.id.toString(),
    endorsee: e.endorsee,
    date: typeof e.createdAt === 'string' ? e.createdAt : new Date(e.createdAt).toISOString(),
    commitment: e.leafHash,
    note: e.note || undefined,
  })) || [];

  const receivedEndorsements = receivedEndorsementsData?.endorsements.map(e => ({
    id: e.id.toString(),
    endorsee: e.endorser,
    date: typeof e.createdAt === 'string' ? e.createdAt : new Date(e.createdAt).toISOString(),
    commitment: e.leafHash,
  })) || [];

  const handleShareLink = async () => {
    if (!address) return;
    
    const vouchUrl = `${window.location.origin}/overview?vouch=${address}`;
    
    try {
      await navigator.clipboard.writeText(vouchUrl);
      toast({
        title: "Link copied!",
        description: "Share this link so others can vouch for you",
      });
    } catch (error) {
      toast({
        title: "Failed to copy link",
        description: vouchUrl,
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    if (!scoreData) return;
    
    const attestation = {
      sub: `user:${address}`,
      localHealth: scoreData.localHealth,
      seedCount: scoreData.seedAddresses.length,
      metrics: scoreData.metrics,
      policy: "ego-network-v1",
      iss: "trustflow.app",
    };
    
    navigator.clipboard.writeText(JSON.stringify(attestation, null, 2));
    console.log('Exported attestation:', attestation);
  };

  const handleEndorse = async (endorsee: string, note?: string) => {
    console.log('Vouch created:', { endorsee, note });
  };

  const handleRevoke = (id: string) => {
    // TODO: remove mock functionality
    console.log('Revoking endorsement:', id);
  };

  useEffect(() => {
    if (vouchAddress && endorseFormRef.current) {
      setTimeout(() => {
        endorseFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [vouchAddress]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Overview</h1>
        <p className="text-muted-foreground">
          Your personal trust hub: view your score, give endorsements, and manage your network
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="space-y-6">
          {isLoadingScore ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">Loading score data...</div>
              </CardContent>
            </Card>
          ) : !isConnected ? (
            <Card>
              <CardHeader>
                <CardTitle>Your Network Health</CardTitle>
                <CardDescription>Connect your wallet to view your network health score</CardDescription>
              </CardHeader>
            </Card>
          ) : scoreData ? (
            <Card className="p-8 rounded-2xl" data-testid="card-score">
              <CardContent className="p-0 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Your Network Health</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold" data-testid="text-local-health">
                        {Math.round(scoreData.localHealth)}
                      </span>
                      <span className="text-2xl text-muted-foreground">/100</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleShareLink}
                      data-testid="button-share-link"
                      title="Share vouch link"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowQRCode(true)}
                      data-testid="button-show-qr"
                      title="Show QR code"
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleExport}
                      data-testid="button-export"
                      title="Export attestation"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Seeds</span>
                    <span className="text-sm font-medium" data-testid="text-seed-count">
                      {scoreData.seedAddresses.length} (you + {scoreData.seedAddresses.length - 1} co-seeds)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Network Size</span>
                    <span className="text-sm font-medium" data-testid="text-total-nodes">
                      {scoreData.metrics.totalNodes} nodes
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Median Min-Cut</span>
                    <span className="text-sm font-medium" data-testid="text-median-mincut">
                      {scoreData.metrics.medianMinCut.toFixed(1)} edges
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg Residual Flow</span>
                    <span className="text-sm font-medium" data-testid="text-avg-flow">
                      {(scoreData.metrics.avgResidualFlow * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Link href="/network">
                    <Button variant="outline" className="w-full" data-testid="button-manage-network">
                      Manage Your Network
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Your Network Health</CardTitle>
                <CardDescription>Building your network</CardDescription>
              </CardHeader>
              <CardContent className="py-8 space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Your network health score will improve as you add co-seeds and grow your trusted network.
                </p>
                {address && (
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setShowQRCode(true)}
                      data-testid="button-show-qr-no-score"
                    >
                      <QrCode className="w-4 h-4" />
                      Show My QR Code
                    </Button>
                    <Link href="/network">
                      <Button size="sm" data-testid="button-setup-network">
                        Setup Network
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div ref={endorseFormRef}>
          <EndorseForm onEndorse={handleEndorse} initialAddress={vouchAddress || undefined} />
        </div>
      </div>

      <Card data-testid="card-endorsements">
        <CardHeader>
          <CardTitle>Vouches</CardTitle>
          <CardDescription>
            Manage your given and received vouches. Vouches are public and verifiable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="given" data-testid="tabs-endorsements">
            <TabsList className="grid w-full grid-cols-2" data-testid="tabs-list-endorsements">
              <TabsTrigger value="given" data-testid="tab-given">
                Given ({isLoadingGiven ? '...' : givenEndorsements.length})
              </TabsTrigger>
              <TabsTrigger value="received" data-testid="tab-received">
                Received ({isLoadingReceived ? '...' : receivedEndorsements.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="given" className="mt-6" data-testid="tab-content-given">
              {isLoadingGiven ? (
                <div className="text-center text-muted-foreground py-8">Loading vouches...</div>
              ) : (
                <EndorsementsList
                  endorsements={givenEndorsements}
                  onRevoke={handleRevoke}
                  emptyMessage={isConnected ? "You haven't vouched for anyone yet" : "Connect your wallet to view vouches"}
                  showRevokeButton={true}
                />
              )}
            </TabsContent>
            <TabsContent value="received" className="mt-6" data-testid="tab-content-received">
              {isLoadingReceived ? (
                <div className="text-center text-muted-foreground py-8">Loading vouches...</div>
              ) : (
                <EndorsementsList
                  endorsements={receivedEndorsements}
                  emptyMessage={isConnected ? "You haven't received any vouches yet" : "Connect your wallet to view vouches"}
                  showRevokeButton={false}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {address && (
        <QRCodeDialog
          open={showQRCode}
          onOpenChange={setShowQRCode}
          address={address}
        />
      )}
    </div>
  );
}
