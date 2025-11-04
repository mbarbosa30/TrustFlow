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
import { QRCodeSVG } from "qrcode.react";
import type { PublicEndorsement } from "@shared/schema";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Overview() {
  const { address, isConnected } = useWallet();
  const [showQRCode, setShowQRCode] = useState(false);
  const [showAllGiven, setShowAllGiven] = useState(false);
  const [showAllReceived, setShowAllReceived] = useState(false);
  const [showInlineQR, setShowInlineQR] = useState(true);
  const [countdown, setCountdown] = useState<string>('');
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

  const userCommunities = userCommunitiesData?.communities?.filter((c: any) => c != null) || [];
  const firstCommunity = userCommunities[0];
  const isManager = userCommunities.some((c: any) => 
    c?.seedAddresses?.includes(address?.toLowerCase())
  );

  // User's active loans across ALL communities (for borrower actions)
  const { data: activeLoansData } = useQuery<{ hasActiveLoans: boolean; activeLoans: any[] }>({
    queryKey: [`/api/loans/user/${address}/active`],
    enabled: isConnected && !!address,
  });

  // KUDOS balance
  const { data: kudosData } = useQuery<{ balance: number; lastClaimedAt: string | null; canClaim: boolean }>({
    queryKey: ['/api/kudos/balance', address],
    enabled: isConnected && !!address,
  });

  const activeLoans = activeLoansData?.activeLoans || [];

  // Calculate claimable KUDOS amount based on LocalHealth
  const claimableAmount = scoreData?.localHealth 
    ? Math.min(1000, Math.floor((scoreData.localHealth * scoreData.localHealth) / 100))
    : 0;

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

  // Countdown timer for KUDOS claim cooldown
  useEffect(() => {
    if (!kudosData?.lastClaimedAt || kudosData.canClaim) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const lastClaimed = new Date(kudosData.lastClaimedAt!);
      const nextClaimTime = new Date(lastClaimed.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const now = new Date();
      const diff = nextClaimTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown('');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setCountdown(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [kudosData]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Overview</h1>
        <p className="text-muted-foreground">
          Your personal trust hub: view your score, give endorsements, and manage your network
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left Column: Network Health Score */}
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

        {/* Right Column: Action Cards */}
        <div className="space-y-4">
          {/* Share Link Card */}
          {address && (
            <Card data-testid="card-share-link">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Share Your Profile</CardTitle>
                    <CardDescription>Let others vouch for you</CardDescription>
                  </div>
                  <Share2 className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {showInlineQR && (
                  <div className="flex justify-center py-2">
                    <div className="bg-white p-3 rounded-lg" data-testid="inline-qr-code">
                      <QRCodeSVG
                        value={address}
                        size={140}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => setShowInlineQR(!showInlineQR)}
                    data-testid="button-toggle-qr-card"
                  >
                    <QrCode className="w-4 h-4" />
                    {showInlineQR ? 'Hide' : 'Show'} QR
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1 gap-2"
                    onClick={handleShareLink}
                    data-testid="button-share-link-card"
                  >
                    <Share2 className="w-4 h-4" />
                    Copy Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* KUDOS Balance Card */}
          {kudosData && (
            <Card data-testid="card-kudos">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">KUDOS Balance</CardTitle>
                    <CardDescription>Reputation tokens</CardDescription>
                  </div>
                  <Coins className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold" data-testid="text-kudos-balance">
                    {kudosData.balance.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">KUDOS</span>
                </div>
                
                {kudosData.canClaim && claimableAmount > 0 && (
                  <>
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="text-sm text-muted-foreground mb-1">Claimable now</div>
                      <div className="text-2xl font-bold text-primary" data-testid="text-claimable-amount">
                        +{claimableAmount.toLocaleString()} KUDOS
                      </div>
                    </div>
                    <Link href="/kudos">
                      <Button className="w-full gap-2" data-testid="button-claim-kudos">
                        <Coins className="w-4 h-4" />
                        Claim {claimableAmount.toLocaleString()} KUDOS
                      </Button>
                    </Link>
                  </>
                )}

                {!kudosData.canClaim && countdown && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground mb-1">Next claim in</div>
                    <div className="text-lg font-semibold" data-testid="text-countdown">
                      {countdown}
                    </div>
                  </div>
                )}

                {!kudosData.canClaim && !countdown && kudosData.lastClaimedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last claimed {new Date(kudosData.lastClaimedAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Active Loans Card (Borrower Actions) */}
          {activeLoans.length > 0 && (
            <Card data-testid="card-active-loans">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Active Loans</CardTitle>
                    <CardDescription>{activeLoans.length} loan{activeLoans.length > 1 ? 's' : ''} in progress</CardDescription>
                  </div>
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeLoans.slice(0, 2).map((loan: any) => (
                  <Link key={loan.id} href={`/credit/${loan.communityId}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer" data-testid={`loan-card-${loan.id}`}>
                      <div>
                        <div className="font-medium">{loan.currency} {loan.principalUsdc.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {loan.tenorMonths} month{loan.tenorMonths > 1 ? 's' : ''} term
                        </div>
                      </div>
                      <Badge variant="outline" data-testid={`badge-loan-status-${loan.id}`}>
                        {loan.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {activeLoans.length > 2 && (
                  <p className="text-xs text-center text-muted-foreground pt-1">
                    +{activeLoans.length - 2} more loan{activeLoans.length - 2 > 1 ? 's' : ''}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Apply for Microcredit Card */}
          {userCommunities.length > 0 && activeLoans.length === 0 && firstCommunity && (
            <Card data-testid="card-apply-microcredit">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Need Funding?</CardTitle>
                    <CardDescription>Apply for microcredit in your community</CardDescription>
                  </div>
                  <DollarSign className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href={`/credit/${firstCommunity.id}`}>
                  <Button className="w-full gap-2" data-testid="button-apply-microcredit">
                    <DollarSign className="w-4 h-4" />
                    Apply for Microcredit
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Lending Management Card (for managers/seeds) */}
          {isManager && (
            <Card data-testid="card-lending-management">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Lending Management</CardTitle>
                    <CardDescription>Review loan applications & payments</CardDescription>
                  </div>
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/lending-dashboard">
                  <Button variant="outline" className="w-full gap-2" data-testid="button-lending-dashboard">
                    View Dashboard
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Vouch Form */}
      <div ref={endorseFormRef} className="mb-8">
        <EndorseForm onEndorse={handleEndorse} initialAddress={vouchAddress || undefined} />
      </div>

      <Card data-testid="card-endorsements">
        <CardHeader>
          <CardTitle>Recent Vouches</CardTitle>
          <CardDescription>
            Your most recent vouches. Vouches are public and verifiable.
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
            <TabsContent value="given" className="mt-6 space-y-4" data-testid="tab-content-given">
              {isLoadingGiven ? (
                <div className="text-center text-muted-foreground py-8">Loading vouches...</div>
              ) : (
                <>
                  <EndorsementsList
                    endorsements={showAllGiven ? givenEndorsements : givenEndorsements.slice(0, 7)}
                    onRevoke={handleRevoke}
                    emptyMessage={isConnected ? "You haven't vouched for anyone yet" : "Connect your wallet to view vouches"}
                    showRevokeButton={true}
                  />
                  {givenEndorsements.length > 7 && (
                    <div className="text-center">
                      <Button
                        variant="ghost"
                        onClick={() => setShowAllGiven(!showAllGiven)}
                        data-testid="button-toggle-given"
                      >
                        {showAllGiven ? 'Show Less' : `View All ${givenEndorsements.length} Vouches`}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            <TabsContent value="received" className="mt-6 space-y-4" data-testid="tab-content-received">
              {isLoadingReceived ? (
                <div className="text-center text-muted-foreground py-8">Loading vouches...</div>
              ) : (
                <>
                  <EndorsementsList
                    endorsements={showAllReceived ? receivedEndorsements : receivedEndorsements.slice(0, 7)}
                    emptyMessage={isConnected ? "You haven't received any vouches yet" : "Connect your wallet to view vouches"}
                    showRevokeButton={false}
                  />
                  {receivedEndorsements.length > 7 && (
                    <div className="text-center">
                      <Button
                        variant="ghost"
                        onClick={() => setShowAllReceived(!showAllReceived)}
                        data-testid="button-toggle-received"
                      >
                        {showAllReceived ? 'Show Less' : `View All ${receivedEndorsements.length} Vouches`}
                      </Button>
                    </div>
                  )}
                </>
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
