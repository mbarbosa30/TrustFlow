import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  ArrowLeft, Users, Settings, Globe, Lock, Activity, 
  TrendingUp, Network, Shield, DollarSign, CheckCircle, HandHeart, Wallet, Clock
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Loan {
  id: number;
  borrowerAddress: string;
  communityId: number;
  principalUsdc: number;
  tenorMonths: number;
  aprBps: number;
  status: string;
  nextInstallmentIdx?: number;
  nextDueDate?: string;
}

interface LateInstallment {
  installmentId: number;
  loanId: number;
  idx: number;
  borrowerAddress: string;
  dueDate: string;
  totalDue: number;
  totalPaid: number;
  outstandingAmount: number;
  daysLate: number;
  status: string;
}

interface Pledge {
  id: number;
  loanId: number;
  donorAddress: string;
  monthlyUsdc: number;
  remainingMonths: number;
  totalPledged: number;
  totalApplied: number;
  status: string;
  createdAt: string;
}

interface Assist {
  id: number;
  loanId: number;
  supporterAddress: string;
  usdcAmount: number;
  arsCredit: number;
  aaveTxHash: string | null;
  createdAt: string;
}

export default function CommunityDetail() {
  const params = useParams();
  const communityId = Number(params.id) || 0;
  const { address } = useAccount();
  const { toast } = useToast();
  const { t } = useLanguage();

  // Support tab state
  const [supportTab, setSupportTab] = useState("loans");
  const [selectedLoan, setSelectedLoan] = useState<number | null>(null);
  const [ibdAmount, setIbdAmount] = useState([50]);

  const { data: communityData, isLoading: communityLoading } = useQuery<{ community: any }>({
    queryKey: ["/api/communities", communityId],
  });

  // Fetch community metrics (sponsors, loans)
  const { data: communityMetrics } = useQuery<{
    sponsorsActive: number;
    totalLoans: number;
    activeLoans: number;
  }>({
    queryKey: ["/api/communities", communityId, "metrics"],
  });

  // Fetch loans for this community (enabled always for metrics display)
  const { data: availableLoans, isLoading: loansLoading } = useQuery<Loan[]>({
    queryKey: ["/api/support/available-loans"],
    select: (data) => data.filter((loan: Loan) => loan.communityId === communityId),
  });

  // Fetch late installments for this community (community-wide, not wallet-gated)
  const { data: allLateInstallments, isLoading: installmentsLoading } = useQuery<LateInstallment[]>({
    queryKey: ["/api/support/late-installments"],
  });

  const lateInstallments = allLateInstallments?.filter(
    (inst) => availableLoans?.some(loan => loan.id === inst.loanId && loan.communityId === communityId)
  ) || [];

  // Fetch supporter portfolio
  const { data: portfolio, isLoading: portfolioLoading } = useQuery<{
    pledges: Pledge[];
    assists: Assist[];
  }>({
    queryKey: ["/api/support/portfolio", address],
    enabled: !!address,
  });

  // Filter portfolio by community
  const communityPledges = portfolio?.pledges.filter(
    (p) => availableLoans?.some(loan => loan.id === p.loanId)
  ) || [];

  const communityAssists = portfolio?.assists.filter(
    (a) => availableLoans?.some(loan => loan.id === a.loanId)
  ) || [];

  // IBD pledge mutation
  const pledgeMutation = useMutation({
    mutationFn: async (data: { loanId: number; monthlyUsdc: number }) => {
      return await apiRequest("POST", "/api/subsidies/ibd", {
        loanId: data.loanId,
        donorAddress: address,
        monthlyUsdc: data.monthlyUsdc,
      });
    },
    onSuccess: () => {
      toast({
        title: t('communityDetail.ibdCreated'),
        description: t('communityDetail.ibdCreatedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/support/portfolio", address] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/available-loans"] });
      setSelectedLoan(null);
      setIbdAmount([50]);
    },
    onError: (error: Error) => {
      toast({
        title: t('communityDetail.errorCreatingCommitment'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Repay-Assist mutation
  const assistMutation = useMutation({
    mutationFn: async (data: { installmentId: number; amountUsdc: number }) => {
      return await apiRequest("POST", "/api/subsidies/repay-assist", {
        installmentId: data.installmentId,
        supporterAddress: address,
        amountUsdc: data.amountUsdc,
      });
    },
    onSuccess: () => {
      toast({
        title: t('communityDetail.raActivated'),
        description: t('communityDetail.raActivatedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/support/portfolio", address] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/late-installments"] });
    },
    onError: (error: Error) => {
      toast({
        title: t('communityDetail.errorCoveringInstallment'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: statusData } = useQuery<any>({
    queryKey: ["/api/status"],
  });

  const { data: endorsementsData } = useQuery<{ endorsements: any[] }>({
    queryKey: ["/api/endorsements"],
  });

  const { data: scoresData } = useQuery<{ scores: any[] }>({
    queryKey: ["/api/scores"],
  });

  if (communityLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-8 bg-accent rounded w-1/2 mb-2" />
            <div className="h-4 bg-accent rounded w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 bg-accent rounded w-full" />
              <div className="h-4 bg-accent rounded w-2/3" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const community = communityData?.community;

  if (!community) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('communities.notFound')}</h3>
            <Link href="/communities">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back')} to {t('communities.title')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const policy = community.policy;
  
  const communityEndorsements = endorsementsData?.endorsements?.filter(
    (e: any) => e.communityId === communityId
  ) || [];
  
  const communityScores = scoresData?.scores?.filter(
    (s: any) => s.communityId === communityId
  ) || [];

  const acceptedMembers = communityScores.filter((s: any) => s.isAccepted);
  const networkSize = acceptedMembers.length;
  const totalEndorsements = communityEndorsements.length;
  
  const tierDistribution = acceptedMembers.reduce((acc: any, s: any) => {
    acc[s.tier] = (acc[s.tier] || 0) + 1;
    return acc;
  }, {});

  const avgMinCut = acceptedMembers.length > 0
    ? acceptedMembers.reduce((sum: number, s: any) => sum + (s.minCut || 0), 0) / acceptedMembers.length
    : 0;

  const avgFlow = acceptedMembers.length > 0
    ? acceptedMembers.reduce((sum: number, s: any) => sum + (s.flow || 0), 0) / acceptedMembers.length
    : 0;

  const uniqueMembers = new Set([
    ...communityEndorsements.map((e: any) => e.endorser),
    ...communityEndorsements.map((e: any) => e.endorsee),
  ]);

  const healthMetrics = statusData?.communityHealth?.[communityId] || statusData?.health;
  const ghi = healthMetrics?.ghi || 0;

  // Lending metrics - community-wide calculations
  const activeLoans = communityMetrics?.activeLoans || 0;
  
  // On-Time Rate 90d: Calculate percentage of active loans that are not late
  // Deduplicate by loanId to count each late loan once, regardless of how many late installments it has
  const communityLateInstallments = allLateInstallments?.filter(
    inst => availableLoans?.some(loan => loan.id === inst.loanId)
  ) || [];
  const uniqueLateLoanIds = new Set(communityLateInstallments.map(inst => inst.loanId));
  const lateLoansCount = uniqueLateLoanIds.size;
  const onTimeRate = activeLoans > 0
    ? Math.max(0, ((activeLoans - lateLoansCount) / activeLoans * 100))
    : 100;

  // Sponsors Active: From backend community metrics
  const sponsorsActive = communityMetrics?.sponsorsActive || 0;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <Link href="/communities">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Communities
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-lg" data-testid="card-community-header">
          {/* Cover Image Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 dark:from-primary/10 dark:to-accent/10" />
          {community.coverUrl && (
            <img 
              src={community.coverUrl} 
              alt={`${community.name} cover`}
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
          )}
          
          {/* Hero Content */}
          <div className="relative px-8 py-12">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Logo */}
              <div className="flex-shrink-0">
                {community.logoUrl ? (
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-background border-2 border-primary/20 shadow-lg">
                    <img src={community.logoUrl} alt={`${community.name} logo`} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-lg">
                    <Users className="w-12 h-12 text-primary" />
                  </div>
                )}
              </div>

              {/* Community Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-4xl font-bold">{community.name}</h1>
                      {community.visibility === "public" ? (
                        <Globe className="w-6 h-6 text-muted-foreground" />
                      ) : (
                        <Lock className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    {community.location && (
                      <Badge variant="outline" className="mb-2">
                        <Globe className="w-3 h-3 mr-1" />
                        {community.location}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <p className="text-lg text-muted-foreground mb-6 max-w-3xl">
                  {community.description}
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap gap-3">
                  <Link href={`/credit/${communityId}`}>
                    <Button size="lg" data-testid="button-apply-credit">
                      <DollarSign className="w-4 h-4 mr-2" />
                      {t('communityDetail.applyForCredit')}
                    </Button>
                  </Link>
                  <Link href={`/vouch?community=${communityId}`}>
                    <Button variant="outline" size="lg" data-testid="button-vouch">
                      <HandHeart className="w-4 h-4 mr-2" />
                      Vouch for Member
                    </Button>
                  </Link>
                  {address && (
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => {
                        const supportTabLink = document.querySelector('[data-testid="tab-support"]') as HTMLElement;
                        supportTabLink?.click();
                      }}
                      data-testid="button-support"
                    >
                      <HandHeart className="w-4 h-4 mr-2" />
                      Support Borrowers
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Metrics Dashboard */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <Card data-testid="card-stat-members">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('communityDetail.accepted')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{networkSize}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('common.members')}</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-health">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('communityDetail.health')}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ghi}</div>
              <p className="text-xs text-muted-foreground mt-1">GHI Score</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-avgcut">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('communityDetail.minCut')}</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgMinCut.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('communityDetail.avgResistance')}</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-loans">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('communityDetail.activeLoans')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeLoans}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('common.current')}</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-ontime">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('communityDetail.onTime')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{onTimeRate.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground mt-1">{t('communityDetail.rate90d')}</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-endorsements">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('communityDetail.vouches')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEndorsements}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('common.total')}</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-sponsors">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('communityDetail.sponsors')}</CardTitle>
              <HandHeart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sponsorsActive}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('common.active')}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview" data-testid="tab-overview">{t('communityDetail.tabOverview')}</TabsTrigger>
            <TabsTrigger value="credit" data-testid="tab-credit">{t('communityDetail.tabCredit')}</TabsTrigger>
            <TabsTrigger value="support" data-testid="tab-support">{t('communityDetail.tabSupport')}</TabsTrigger>
            <TabsTrigger value="trust" data-testid="tab-trust">{t('communityDetail.tabTrust')}</TabsTrigger>
            <TabsTrigger value="impact" data-testid="tab-impact">{t('communityDetail.tabImpact')}</TabsTrigger>
            <TabsTrigger value="updates" data-testid="tab-updates">{t('communityDetail.tabUpdates')}</TabsTrigger>
            <TabsTrigger value="people" data-testid="tab-people">{t('communityDetail.tabPeople')}</TabsTrigger>
            <TabsTrigger value="transparency" data-testid="tab-transparency">{t('communityDetail.tabTransparency')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('communityDetail.trustDistribution')}</CardTitle>
                  <CardDescription>{t('communityDetail.trustDistributionDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {policy.tiers.map((tier: string, idx: number) => {
                    const count = tierDistribution[tier] || 0;
                    const percentage = networkSize > 0 ? (count / networkSize) * 100 : 0;
                    return (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary">{tier}</Badge>
                          <span className="text-sm font-medium">{count} {t('common.members')}</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('communityDetail.networkMetrics')}</CardTitle>
                  <CardDescription>{t('communityDetail.networkMetricsDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('communityDetail.avgFlow')}</span>
                    <span className="text-lg font-semibold">{avgFlow.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('communityDetail.avgMinCut')}</span>
                    <span className="text-lg font-semibold">{avgMinCut.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('communityDetail.activeParticipants')}</span>
                    <span className="text-lg font-semibold">{uniqueMembers.size}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('communityDetail.graphHealth')}</span>
                    <span className="text-lg font-semibold">{ghi}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('communityDetail.aboutCommunity')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="leading-relaxed">{community.description}</p>
                <div className="pt-3 border-t space-y-2">
                  <h4 className="font-semibold">{t('communityDetail.endorsementCriteria')}</h4>
                  <p className="text-muted-foreground">
                    {t('communityDetail.memberEndorse')} <span className="font-medium">"{community.promptText}"</span>
                  </p>
                  <p className="text-muted-foreground">
                    {t('communityDetail.cryptoVerified')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credit" className="space-y-6 mt-6">
            {!address ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('communityDetail.connectForCredit')}</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-4">
                      {t('communityDetail.connectForCreditDesc')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      {t('communityDetail.creditAccess')}
                    </CardTitle>
                    <CardDescription>{t('communityDetail.creditAccessDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-accent/50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{t('communityDetail.eligibilityStatus')}</h4>
                        {acceptedMembers.some((m: any) => m.address.toLowerCase() === address.toLowerCase()) ? (
                          <Badge className="bg-green-500">{t('communityDetail.eligible')}</Badge>
                        ) : (
                          <Badge variant="outline">{t('communityDetail.notEligible')}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {acceptedMembers.some((m: any) => m.address.toLowerCase() === address.toLowerCase())
                          ? t('communityDetail.eligibleDesc')
                          : t('communityDetail.notEligibleDesc')}
                      </p>
                      <div className="flex gap-3">
                        <Link href={`/credit/${communityId}`} className="flex-1">
                          <Button className="w-full" data-testid="button-apply-credit-tab">
                            <DollarSign className="w-4 h-4 mr-2" />
                            {availableLoans?.some(l => l.borrowerAddress.toLowerCase() === address.toLowerCase())
                              ? t('communityDetail.viewMyLoan')
                              : t('communityDetail.applyForCredit')}
                          </Button>
                        </Link>
                        <Link href={`/lending-dashboard/${communityId}`}>
                          <Button variant="outline">
                            {t('communityDetail.viewOffers')}
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {(availableLoans?.filter(l => l.borrowerAddress.toLowerCase() === address.toLowerCase()).length ?? 0) > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">{t('communityDetail.yourActiveLoans')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {availableLoans?.filter(l => l.borrowerAddress.toLowerCase() === address.toLowerCase()).map((loan) => (
                            <div key={loan.id} className="p-4 rounded-lg border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">{t('communityDetail.loanNumber')}{loan.id}</span>
                                <Badge>{loan.status}</Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-muted-foreground">{t('communityDetail.principal')}</p>
                                  <p className="font-semibold">${(loan.principalUsdc / 1000).toFixed(0)}k ARS</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">{t('communityDetail.term')}</p>
                                  <p className="font-semibold">{loan.tenorMonths} {t('common.months')}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">{t('communityDetail.apr')}</p>
                                  <p className="font-semibold">{(loan.aprBps / 100).toFixed(1)}%</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">{t('communityDetail.nextDue')}</p>
                                  <p className="font-semibold">{loan.nextDueDate || "N/A"}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="trust" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Endorsement Criteria
                </CardTitle>
                <CardDescription>How members vouch for each other in this community</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-6 rounded-lg bg-primary/5 border border-primary/20">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Endorsement Prompt</h3>
                  <p className="text-xl font-medium">"{community.promptText}"</p>
                  <p className="text-sm text-muted-foreground mt-3">
                    All endorsements are cryptographically verified against this prompt to ensure consistency.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-accent">
                    <div className="text-xs text-muted-foreground mb-1">Min Cut</div>
                    <div className="text-2xl font-semibold">{policy.acceptance.minCut}</div>
                    <p className="text-xs text-muted-foreground mt-1">Required paths</p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent">
                    <div className="text-xs text-muted-foreground mb-1">Vertex Disjoint</div>
                    <div className="text-2xl font-semibold">{policy.acceptance.vertexDisjoint}</div>
                    <p className="text-xs text-muted-foreground mt-1">Independent paths</p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent">
                    <div className="text-xs text-muted-foreground mb-1">Min Seeds</div>
                    <div className="text-2xl font-semibold">{policy.acceptance.seedCoverage.minSeeds}</div>
                    <p className="text-xs text-muted-foreground mt-1">Seed connections</p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent">
                    <div className="text-xs text-muted-foreground mb-1">Seed Quality</div>
                    <div className="text-2xl font-semibold">
                      {(policy.acceptance.seedCoverage.minSeedScore * 100).toFixed(0)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Min score</p>
                  </div>
                </div>

                {address && (
                  <Card className="bg-accent/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Your Trust Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {acceptedMembers.some((m: any) => m.address.toLowerCase() === address.toLowerCase()) ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="font-semibold">You are accepted in this community</span>
                          </div>
                          {communityScores.filter((s: any) => s.address.toLowerCase() === address.toLowerCase()).map((score: any) => (
                            <div key={score.id} className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Trust Score</p>
                                <p className="font-semibold">{score.sts?.toFixed(2) || "N/A"}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Min-Cut</p>
                                <p className="font-semibold">{score.minCut?.toFixed(2) || "N/A"}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            You need endorsements from community members to build trust and gain acceptance.
                          </p>
                          <Link href={`/vouch?community=${communityId}`}>
                            <Button variant="outline" className="w-full">
                              Learn How to Get Endorsed
                            </Button>
                          </Link>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="impact" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Community Impact
                </CardTitle>
                <CardDescription>Lending performance and member success stories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Impact Dashboard Coming Soon</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Track repayment rates, subsidy impact, cohort performance, and success stories
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="updates" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Community Updates
                </CardTitle>
                <CardDescription>Announcements, workshops, and discussions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Updates Feed Coming Soon</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Community announcements, workshop notes, and threaded discussions with role badges
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="people" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Community Members
                </CardTitle>
                <CardDescription>Seeds, mentors, sponsors, and operators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Member Directory Coming Soon</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    View seeds, mentors, sponsors with their roles and public profiles
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transparency" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Transparency & Receipts
                </CardTitle>
                <CardDescription>Policy history, epoch data, and verifiable receipts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Transparency Dashboard Coming Soon</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Policy changes, receipts feed, epoch data with verifiable hashes
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  Network Activity
                </CardTitle>
                <CardDescription>Recent endorsements and member activity</CardDescription>
              </CardHeader>
              <CardContent>
                {communityEndorsements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No endorsements yet. Be the first to vouch for someone!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {communityEndorsements.slice(0, 10).map((endorsement: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="text-sm font-medium font-mono">
                              {endorsement.endorser.slice(0, 6)}...{endorsement.endorser.slice(-4)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              endorsed {endorsement.endorsee.slice(0, 6)}...{endorsement.endorsee.slice(-4)}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Epoch {endorsement.epoch}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policy" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Acceptance Criteria
                  </CardTitle>
                  <CardDescription>Sybil-resistance requirements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-accent">
                      <div className="text-xs text-muted-foreground mb-1">Min Cut</div>
                      <div className="text-2xl font-semibold">{policy.acceptance.minCut}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-accent">
                      <div className="text-xs text-muted-foreground mb-1">Vertex Disjoint</div>
                      <div className="text-2xl font-semibold">{policy.acceptance.vertexDisjoint}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-accent">
                      <div className="text-xs text-muted-foreground mb-1">Min Seeds</div>
                      <div className="text-2xl font-semibold">{policy.acceptance.seedCoverage.minSeeds}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-accent">
                      <div className="text-xs text-muted-foreground mb-1">Seed Quality</div>
                      <div className="text-2xl font-semibold">
                        {(policy.acceptance.seedCoverage.minSeedScore * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-accent col-span-2">
                      <div className="text-xs text-muted-foreground mb-1">Per-Seed Share</div>
                      <div className="text-2xl font-semibold">
                        ≥{(policy.acceptance.seedCoverage.minPerSeedShare * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trust Tiers & Capacity</CardTitle>
                  <CardDescription>Badge levels and flow limits</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {policy.tiers.map((tier: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-sm">
                        {tier}
                      </Badge>
                    ))}
                  </div>

                  <div className="pt-3 border-t">
                    <h4 className="text-sm font-semibold mb-3">Capacity by Distance</h4>
                    <div className="flex gap-2">
                      {policy.nodeCap.distance.map((cap: number, idx: number) => (
                        <div key={idx} className="flex-1 p-2 rounded-lg bg-accent text-center">
                          <div className="text-xs text-muted-foreground">d={idx}</div>
                          <div className="text-lg font-semibold">{cap}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-base">{t('communityDetail.howToJoin')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{t('communityDetail.toEarnTrust')} {community.name}:</p>
                <ol className="list-decimal list-inside space-y-1.5 ml-2">
                  <li>{t('communityDetail.step1')} "{community.promptText}"</li>
                  <li>{t('communityDetail.step2')} {policy.acceptance.minCut})</li>
                  <li>{t('communityDetail.step3')} {policy.acceptance.vertexDisjoint} {t('communityDetail.step3cont')}</li>
                  <li>{t('communityDetail.step4')} {policy.acceptance.seedCoverage.minSeeds} {t('communityDetail.step4cont')}</li>
                  <li>{t('communityDetail.step5')} {(policy.acceptance.seedCoverage.minPerSeedShare * 100).toFixed(0)}% {t('communityDetail.step5cont')}</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support" className="space-y-6 mt-6">
            {!address ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <HandHeart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('communityDetail.connectForCredit')}</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      {t('communityDetail.connectForSupport')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Tabs value={supportTab} onValueChange={setSupportTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="loans" data-testid="tab-interest-buydown">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {t('communityDetail.interestBuydown')}
                  </TabsTrigger>
                  <TabsTrigger value="late" data-testid="tab-repay-assist">
                    <HandHeart className="h-4 w-4 mr-2" />
                    {t('communityDetail.repayAssist')}
                  </TabsTrigger>
                  <TabsTrigger value="portfolio" data-testid="tab-portfolio">
                    <Wallet className="h-4 w-4 mr-2" />
                    {t('communityDetail.myPortfolio')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="loans" className="space-y-4 mt-4">
                  <Card data-testid="card-ibd-info">
                    <CardHeader>
                      <CardTitle>{t('communityDetail.interestBuydown')}</CardTitle>
                      <CardDescription>
                        {t('communityDetail.ibdDesc')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loansLoading ? (
                        <p className="text-muted-foreground">{t('common.loading')}</p>
                      ) : !availableLoans || availableLoans.length === 0 ? (
                        <p className="text-muted-foreground">{t('communityDetail.noLoansIBD')}</p>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid gap-3">
                            {availableLoans.map((loan) => (
                              <Card
                                key={loan.id}
                                className={`cursor-pointer transition-colors ${
                                  selectedLoan === loan.id ? "border-primary" : ""
                                }`}
                                onClick={() => setSelectedLoan(loan.id)}
                                data-testid={`card-loan-${loan.id}`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-mono text-sm text-muted-foreground">
                                        {loan.borrowerAddress.slice(0, 6)}...{loan.borrowerAddress.slice(-4)}
                                      </p>
                                      <p className="text-lg font-semibold">
                                        ${(loan.principalUsdc / 1000).toFixed(0)}k ARS
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {loan.tenorMonths} months @ {(loan.aprBps / 100).toFixed(1)}% APR
                                      </p>
                                    </div>
                                    <Badge variant="secondary">{loan.status === "ACTIVE" ? "ACTIVE" : loan.status}</Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>

                          {selectedLoan && (
                            <Card data-testid="card-ibd-pledge">
                              <CardHeader>
                                <CardTitle className="text-lg">{t('communityDetail.setMonthlyCommitment')}</CardTitle>
                                <CardDescription>
                                  {t('communityDetail.monthlyCommitmentDesc')}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">{t('communityDetail.monthlyAmount')}</label>
                                    <span className="text-lg font-semibold">${ibdAmount[0] * 10}k ARS</span>
                                  </div>
                                  <Slider
                                    value={ibdAmount}
                                    onValueChange={setIbdAmount}
                                    min={10}
                                    max={200}
                                    step={10}
                                    data-testid="slider-ibd-amount"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    {t('communityDetail.commitRange')}
                                  </p>
                                </div>

                                <Button
                                  onClick={() =>
                                    pledgeMutation.mutate({
                                      loanId: selectedLoan,
                                      monthlyUsdc: ibdAmount[0],
                                    })
                                  }
                                  disabled={pledgeMutation.isPending}
                                  className="w-full"
                                  data-testid="button-create-pledge"
                                >
                                  {pledgeMutation.isPending ? t('communityDetail.creating') : t('communityDetail.activateCommitment')}
                                </Button>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="late" className="space-y-4 mt-4">
                  <Card data-testid="card-ra-info">
                    <CardHeader>
                      <CardTitle>Repay-Assist</CardTitle>
                      <CardDescription>
                        Cover late installments. Borrower repays you with a 6% premium.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {installmentsLoading ? (
                        <p className="text-muted-foreground">Loading late installments...</p>
                      ) : !lateInstallments || lateInstallments.length === 0 ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <p>All installments are up to date. No Repay-Assist opportunities available in this community.</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Borrower</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead>Days Late</TableHead>
                              <TableHead>Outstanding</TableHead>
                              <TableHead>Your Return (6%)</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lateInstallments.map((installment) => (
                              <TableRow key={installment.installmentId} data-testid={`row-late-${installment.installmentId}`}>
                                <TableCell className="font-mono text-sm">
                                  {installment.borrowerAddress.slice(0, 6)}...{installment.borrowerAddress.slice(-4)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-orange-500" />
                                    {format(new Date(installment.dueDate), "MMM d, yyyy")}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="destructive">{installment.daysLate} days</Badge>
                                </TableCell>
                                <TableCell className="font-semibold">
                                  ${(installment.outstandingAmount / 1000).toFixed(1)}k ARS
                                </TableCell>
                                <TableCell className="text-green-600 font-semibold">
                                  ${((installment.outstandingAmount * 1.06) / 1000).toFixed(1)}k ARS
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      assistMutation.mutate({
                                        installmentId: installment.installmentId,
                                        amountUsdc: installment.outstandingAmount,
                                      })
                                    }
                                    disabled={assistMutation.isPending}
                                    data-testid={`button-assist-${installment.installmentId}`}
                                  >
                                    {assistMutation.isPending ? "Covering..." : "Cover Now"}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="portfolio" className="space-y-4 mt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card data-testid="card-active-pledges">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 h-5" />
                          Active Interest Buy-Downs
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {portfolioLoading ? (
                          <p className="text-muted-foreground">Loading portfolio...</p>
                        ) : !communityPledges || communityPledges.length === 0 ? (
                          <p className="text-muted-foreground">No active Interest Buy-Down commitments in this community.</p>
                        ) : (
                          <div className="space-y-3">
                            {communityPledges.map((pledge) => (
                              <Card key={pledge.id} data-testid={`pledge-${pledge.id}`}>
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">Loan #{pledge.loanId}</span>
                                    <Badge variant="secondary">{pledge.status === "ACTIVE" ? "ACTIVE" : pledge.status}</Badge>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm">Monthly:</span>
                                      <span className="font-semibold">${(pledge.monthlyUsdc / 1000).toFixed(1)}k ARS</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm">Remaining:</span>
                                      <span className="font-semibold">{pledge.remainingMonths} months</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>Applied: ${(pledge.totalApplied / 1000).toFixed(1)}k</span>
                                      <span>Total: ${(pledge.totalPledged / 1000).toFixed(1)}k</span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card data-testid="card-active-assists">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <HandHeart className="h-5 h-5" />
                          Active Assists
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {portfolioLoading ? (
                          <p className="text-muted-foreground">Loading portfolio...</p>
                        ) : !communityAssists || communityAssists.length === 0 ? (
                          <p className="text-muted-foreground">No active assists in this community.</p>
                        ) : (
                          <div className="space-y-3">
                            {communityAssists.map((assist) => (
                              <Card key={assist.id} data-testid={`assist-${assist.id}`}>
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">
                                      Loan #{assist.loanId}
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm">USDC Sent:</span>
                                      <span className="font-semibold">${assist.usdcAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm">ARS Credit:</span>
                                      <span className="font-semibold">${(assist.arsCredit / 1000).toFixed(1)}k</span>
                                    </div>
                                    {assist.aaveTxHash && (
                                      <div className="text-xs text-muted-foreground truncate">
                                        Tx: {assist.aaveTxHash}
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>

          <TabsContent value="economy" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Economic Development
                </CardTitle>
                <CardDescription>Transaction data and financial activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Economic metrics including transaction volumes, USDC transfers, and weighted PageRank based on financial activity will be available in Phase 2.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-accent/50">
              <CardHeader>
                <CardTitle className="text-base">Planned Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Transaction-weighted PageRank for economic influence scoring</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>USDC transfer volume tracking and analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>EigenTrust algorithm for reputation-based ranking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Community economic health metrics and trends</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
