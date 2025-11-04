import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { CheckCircle2, XCircle, Clock, DollarSign, TrendingUp, AlertCircle, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import type { WalletProfile, Loan, Installment, PendingPayment } from "@shared/schema";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface LoanDetails {
  loan: Loan;
  totalPaid: number;
  totalDue: number;
  nextInstallment?: Installment;
}

interface LendingPolicy {
  enabled: boolean;
  // New array format (actual database schema)
  loanButtonsUsdc?: number[];
  tenorsMonths?: number[];
  // Legacy object format (for backward compatibility)
  loanAmounts?: {
    min: number;
    max: number;
    step: number;
  };
  tenorMonths?: {
    min: number;
    max: number;
    step: number;
  };
  annualInterestRate?: number;
}

interface Community {
  id: number;
  name: string;
  currency: string;
  lendingPolicyJson: LendingPolicy;
}

interface CommunityResponse {
  community: Community;
  seeds: any[];
  latestEpoch: any;
}

interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  trustMetrics?: {
    minCut: number;
    ghi: number;
    sts: number;
    tier: string;
    isAccepted: boolean;
  };
  amounts?: number[];
}

interface LoanHistoryItemProps {
  loan: Loan;
  isExpanded: boolean;
  onToggle: () => void;
  currency: string;
}

function LoanHistoryItem({ loan, isExpanded, onToggle, currency }: LoanHistoryItemProps) {
  const { t } = useLanguage();
  
  const { data: loanDetails } = useQuery<LoanDetails & { installments: Installment[] }>({
    queryKey: [`/api/loans/${loan.id}`],
    enabled: isExpanded,
  });

  const { data: paymentsData } = useQuery<{ payments: PendingPayment[] }>({
    queryKey: [`/api/loans/${loan.id}/payments`],
    enabled: isExpanded,
  });

  const installments = loanDetails?.installments || [];
  const payments = paymentsData?.payments || [];

  const getInstallmentPayments = (installmentId: number) => {
    return payments.filter(p => p.installmentId === installmentId);
  };

  const getInstallmentPaidAmount = (installmentId: number) => {
    return payments
      .filter(p => p.installmentId === installmentId && p.status === 'APPROVED')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="default" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'PENDING':
        return <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return null;
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="border rounded-lg" data-testid={`loan-${loan.id}`}>
        <CollapsibleTrigger className="w-full p-4 hover-elevate flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <div className="text-left">
              <p className="font-medium">{formatCurrency(loan.principalUsdc, currency)}</p>
              <p className="text-sm text-muted-foreground">
                {loan.tenorMonths} {t('common.months')} • {(loan.aprNominal * 100).toFixed(0)}% TNA
              </p>
            </div>
          </div>
          <Badge variant={loan.status === "PAID" ? "default" : loan.status === "ACTIVE" ? "secondary" : "destructive"}>
            {loan.status === "PAID" ? t('credit.statusPaid') : loan.status === "ACTIVE" ? t('credit.statusActive') : t('credit.statusDefault')}
          </Badge>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t p-4 space-y-4">
            {installments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No installment data available</p>
            ) : (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Payment Schedule</h4>
                {installments.map((installment, idx) => {
                  const paidAmount = getInstallmentPaidAmount(installment.id);
                  const installmentPayments = getInstallmentPayments(installment.id);
                  const isPaid = paidAmount >= installment.totalDue;
                  const isOverdue = new Date(installment.dueDate) < new Date() && !isPaid;

                  return (
                    <div key={installment.id} className="border rounded-md p-3 space-y-2" data-testid={`installment-${installment.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Installment #{idx + 1}</span>
                            {isPaid && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                            {isOverdue && <AlertCircle className="h-4 w-4 text-destructive" />}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(installment.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(installment.totalDue, currency)}</p>
                          {paidAmount > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Paid: {formatCurrency(paidAmount, currency)}
                            </p>
                          )}
                        </div>
                      </div>

                      {installmentPayments.length > 0 && (
                        <div className="space-y-1 pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground">Payment Submissions:</p>
                          {installmentPayments.map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between text-xs" data-testid={`payment-${payment.id}`}>
                              <span className="text-muted-foreground">
                                {new Date(payment.submittedAt).toLocaleDateString()} - {formatCurrency(payment.amount, currency)}
                              </span>
                              {getPaymentStatusBadge(payment.status)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function Credit() {
  const params = useParams();
  const communityId = Number(params.id) || 0;
  const { address } = useAccount();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedTenor, setSelectedTenor] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [borrowerName, setBorrowerName] = useState("");
  const [expandedLoanId, setExpandedLoanId] = useState<number | null>(null);

  // Get community data for currency and lending policy
  const { data: communityData, isLoading: communityLoading } = useQuery<CommunityResponse>({
    queryKey: [`/api/communities/${communityId}`],
    enabled: true,
  });

  const community = communityData?.community;
  const currency = community?.currency || 'ARS';
  const lendingPolicy = community?.lendingPolicyJson;

  // Generate available loan amounts from policy
  const availableLoanAmounts = () => {
    if (eligibility?.amounts && eligibility.amounts.length > 0) {
      return eligibility.amounts;
    }
    // Handle both array format (loanButtonsUsdc) and object format (loanAmounts)
    if (lendingPolicy?.loanButtonsUsdc && Array.isArray(lendingPolicy.loanButtonsUsdc)) {
      return lendingPolicy.loanButtonsUsdc;
    }
    if (lendingPolicy?.loanAmounts) {
      const { min, max, step } = lendingPolicy.loanAmounts;
      const amounts = [];
      for (let amount = min; amount <= max; amount += step) {
        amounts.push(amount);
      }
      return amounts;
    }
    return [160000, 240000, 400000, 600000, 800000];
  };

  // Generate available tenors from policy
  const availableTenors = () => {
    // Handle both array format (tenorsMonths) and object format (tenorMonths)
    if (lendingPolicy?.tenorsMonths && Array.isArray(lendingPolicy.tenorsMonths)) {
      return lendingPolicy.tenorsMonths;
    }
    if (lendingPolicy?.tenorMonths) {
      const { min, max, step } = lendingPolicy.tenorMonths;
      const tenors = [];
      for (let tenor = min; tenor <= max; tenor += step) {
        tenors.push(tenor);
      }
      return tenors;
    }
    return [6, 9, 12];
  };

  // Reset loan amount/tenor when community changes
  useEffect(() => {
    // Generate amounts from policy only (ignore eligibility to avoid stale cache)
    const getPolicyAmounts = () => {
      // Handle both array format (loanButtonsUsdc) and object format (loanAmounts)
      if (lendingPolicy?.loanButtonsUsdc && Array.isArray(lendingPolicy.loanButtonsUsdc)) {
        return lendingPolicy.loanButtonsUsdc;
      }
      if (lendingPolicy?.loanAmounts) {
        const { min, max, step } = lendingPolicy.loanAmounts;
        const amounts = [];
        for (let amount = min; amount <= max; amount += step) {
          amounts.push(amount);
        }
        return amounts;
      }
      return [160000, 240000, 400000, 600000, 800000];
    };

    const getPolicyTenors = () => {
      // Handle both array format (tenorsMonths) and object format (tenorMonths)
      if (lendingPolicy?.tenorsMonths && Array.isArray(lendingPolicy.tenorsMonths)) {
        return lendingPolicy.tenorsMonths;
      }
      if (lendingPolicy?.tenorMonths) {
        const { min, max, step } = lendingPolicy.tenorMonths;
        const tenors = [];
        for (let tenor = min; tenor <= max; tenor += step) {
          tenors.push(tenor);
        }
        return tenors;
      }
      return [6, 9, 12];
    };

    const amounts = getPolicyAmounts();
    const tenors = getPolicyTenors();
    
    // Reset to first option when community changes
    if (amounts.length > 0) {
      setSelectedAmount(amounts[0]);
    }
    if (tenors.length > 0) {
      setSelectedTenor(tenors[0]);
    }
  }, [communityId, lendingPolicy]);

  // Get wallet profile
  const { data: walletProfile } = useQuery<WalletProfile>({
    queryKey: [`/api/user/${address}`],
    enabled: !!address,
    retry: false,
  });

  // Pre-fill name from wallet profile
  useEffect(() => {
    if (walletProfile?.name && !borrowerName) {
      setBorrowerName(walletProfile.name);
    }
  }, [walletProfile, borrowerName]);

  // Check loan eligibility
  const { data: eligibility, isLoading: loadingEligibility } = useQuery<EligibilityResult>({
    queryKey: [`/api/loans/eligibility/${communityId}/${address}`],
    enabled: !!address,
  });

  // Get user's loans
  const { data: loansData, isLoading: loadingLoans } = useQuery<{ loans: Loan[] }>({
    queryKey: [`/api/loans/borrower/${communityId}/${address}`],
    enabled: !!address,
  });

  const loans = loansData?.loans || [];
  const activeLoan = loans.find((l) => l.status === "ACTIVE");

  // Get active loan details
  const { data: loanDetails } = useQuery<LoanDetails>({
    queryKey: [`/api/loans/${activeLoan?.id}`],
    enabled: !!activeLoan,
  });

  // Get pending payments for active loan
  const { data: pendingPaymentsData } = useQuery<{ payments: PendingPayment[] }>({
    queryKey: [`/api/lending/pending-payments/${communityId}`, { status: 'PENDING' }],
    enabled: !!activeLoan && !!address,
  });

  const userPendingPayments = pendingPaymentsData?.payments?.filter(
    (p) => activeLoan && p.status === 'PENDING' && p.payerAddress.toLowerCase() === address?.toLowerCase() && p.loanId === activeLoan.id
  ) || [];

  // Create loan mutation
  const createLoanMutation = useMutation({
    mutationFn: async () => {
      if (!borrowerName.trim()) {
        throw new Error(t('credit.errorNameRequired'));
      }
      
      const response = await fetch(`/api/loans/${communityId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: address,
          borrowerName: borrowerName.trim(),
          amount: selectedAmount,
          tenorMonths: selectedTenor,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create loan");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: t('credit.loanCreatedSuccess'), description: t('credit.loanDisbursed') });
      queryClient.invalidateQueries({ queryKey: [`/api/loans/borrower/${communityId}/${address}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/loans/eligibility/${communityId}/${address}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/user/${address}`] });
    },
    onError: (error: any) => {
      toast({ title: t('credit.errorCreatingLoan'), description: error.message, variant: "destructive" });
    },
  });

  // Make payment mutation - creates PENDING payment requiring approval
  const makePaymentMutation = useMutation({
    mutationFn: async (installmentId: number) => {
      if (!activeLoan) {
        throw new Error("No active loan found");
      }

      const amount = parseFloat(paymentAmount);
      
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid payment amount");
      }

      if (loanDetails?.nextInstallment && amount > loanDetails.nextInstallment.totalDue) {
        throw new Error(`Payment amount cannot exceed ${formatCurrency(loanDetails.nextInstallment.totalDue, currency)}`);
      }
      
      const response = await fetch(`/api/loans/${activeLoan.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installmentId,
          amount,
          payerAddress: address,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Payment failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Payment Submitted", 
        description: "Your payment has been submitted and is pending manager approval.",
      });
      setPaymentAmount("");
      queryClient.invalidateQueries({ queryKey: [`/api/lending/pending-payments/${communityId}`] });
    },
    onError: (error: any) => {
      toast({ title: t('credit.errorPayment'), description: error.message, variant: "destructive" });
    },
  });

  if (!address) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-[400px]" data-testid="card-connect-wallet">
          <CardHeader>
            <CardTitle>{t('credit.connectWallet')}</CardTitle>
            <CardDescription>{t('credit.connectWalletDesc')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loadingEligibility || loadingLoans || communityLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p>{t('credit.loadingInfo')}</p>
        </div>
      </div>
    );
  }

  if (!lendingPolicy?.enabled) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-[500px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Lending Not Available
            </CardTitle>
            <CardDescription>
              Lending is not enabled for {community?.name || 'this community'}.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12" data-testid="page-credit">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t('credit.title')}</h1>
          <p className="text-muted-foreground">{community?.name || 'Community'} • {currency}</p>
        </div>
      </div>

      <Tabs defaultValue={activeLoan ? "active" : "apply"}>
        <TabsList data-testid="tabs-credit">
          <TabsTrigger value="apply" data-testid="tab-apply">
            {t('credit.tabApply')}
          </TabsTrigger>
          {activeLoan && (
            <TabsTrigger value="active" data-testid="tab-active-loan">
              {t('credit.tabActive')}
            </TabsTrigger>
          )}
          <TabsTrigger value="history" data-testid="tab-history">
            {t('credit.tabHistory')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apply" className="space-y-4">
          {/* Advisory Warnings */}
          {eligibility && eligibility.reasons.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Advisory Notices</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {eligibility.reasons.map((reason, idx) => (
                    <li key={idx} className="text-sm">{reason}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Trust Profile Card */}
          <Card data-testid="card-trust-profile">
            <CardHeader>
              <CardTitle>{t('credit.trustProfile')}</CardTitle>
              <CardDescription>Your trust metrics (advisory only - not blocking)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {eligibility?.trustMetrics ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Sybil Resistance</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" data-testid="badge-mincut">
                          Min-Cut: {eligibility.trustMetrics.minCut || 0}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Community Health</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" data-testid="badge-ghi">
                          GHI: {eligibility.trustMetrics.ghi || 0}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Trust Tier</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" data-testid="badge-tier">
                          {eligibility.trustMetrics.tier}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Network Status</p>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={eligibility.trustMetrics.isAccepted ? "default" : "secondary"}
                          data-testid="badge-accepted"
                        >
                          {eligibility.trustMetrics.isAccepted ? "Accepted" : "Not Accepted"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {eligibility.trustMetrics.isAccepted && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">Endorsed network member</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">No trust metrics available yet</p>
                  <p className="text-xs text-muted-foreground italic">
                    Get vouched by community members to build your trust profile
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loan Application Form */}
          {!activeLoan && (
            <Card data-testid="card-loan-application">
              <CardHeader>
                <CardTitle>{t('credit.applyLoan')}</CardTitle>
                <CardDescription>In pilot mode, all users can apply regardless of trust score</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="borrower-name">{t('credit.fullName')}</Label>
                  <Input
                    id="borrower-name"
                    placeholder={t('credit.fullNamePlaceholder')}
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    data-testid="input-borrower-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Loan Amount ({currency})</Label>
                  <Select
                    value={selectedAmount?.toString() || ""}
                    onValueChange={(v) => setSelectedAmount(parseInt(v))}
                  >
                    <SelectTrigger id="amount" data-testid="select-loan-amount">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLoanAmounts().map((amount: number) => (
                        <SelectItem key={amount} value={amount.toString()}>
                          {formatCurrency(amount, currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenor">{t('credit.paymentTerm')}</Label>
                  <Select value={selectedTenor?.toString() || ""} onValueChange={(v) => setSelectedTenor(parseInt(v))}>
                    <SelectTrigger id="tenor" data-testid="select-tenor">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTenors().map((months: number) => (
                        <SelectItem key={months} value={months.toString()}>
                          {months} {t('common.months')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={() => createLoanMutation.mutate()}
                    disabled={createLoanMutation.isPending || !borrowerName.trim() || !eligibility?.eligible || !selectedAmount || !selectedTenor}
                    className="w-full"
                    data-testid="button-apply-loan"
                  >
                    {createLoanMutation.isPending ? t('common.processing') : t('credit.applyLoanButton')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {loanDetails && (
            <>
              {/* Pending Payments Alert */}
              {userPendingPayments.length > 0 && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Payments Pending Approval</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-2">
                      {userPendingPayments.map((payment) => (
                        <div key={payment.id} className="text-sm flex items-center justify-between">
                          <span>{formatCurrency(payment.amount, payment.currency)} submitted</span>
                          <Badge variant="secondary">Pending Review</Badge>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs mt-2 text-muted-foreground">
                      Community managers will review and approve your payments
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Loan Overview */}
              <Card data-testid="card-loan-overview">
                <CardHeader>
                  <CardTitle>{t('credit.activeLoan')}</CardTitle>
                  <CardDescription>
                    {formatCurrency(loanDetails.loan.principalUsdc, loanDetails.loan.currency)} • {loanDetails.loan.tenorMonths} {t('common.months')} •{" "}
                    {(loanDetails.loan.aprNominal * 100).toFixed(0)}% TNA
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('credit.paymentProgress')}</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(loanDetails.totalPaid, loanDetails.loan.currency)} / {formatCurrency(loanDetails.totalDue, loanDetails.loan.currency)}
                    </span>
                  </div>
                  <Progress value={(loanDetails.totalPaid / loanDetails.totalDue) * 100} />

                  {loanDetails.nextInstallment && (
                    <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                      <DollarSign className="h-5 w-5" />
                      <div>
                        <p className="font-medium">{t('credit.nextPayment')}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(loanDetails.nextInstallment.totalDue, loanDetails.loan.currency)} {t('credit.dueOn')}{" "}
                          {new Date(loanDetails.nextInstallment.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Interface */}
              {loanDetails.nextInstallment && (
                <Card data-testid="card-make-payment">
                  <CardHeader>
                    <CardTitle>{t('credit.makePayment')}</CardTitle>
                    <CardDescription>Submit payment for manager approval</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment">Payment Amount ({loanDetails.loan.currency})</Label>
                      <Input
                        id="payment"
                        type="number"
                        min="0"
                        max={loanDetails.totalDue - loanDetails.totalPaid}
                        step="0.01"
                        placeholder="0.00"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        data-testid="input-payment-amount"
                      />
                      <p className="text-xs text-muted-foreground">
                        Total Outstanding: {formatCurrency(loanDetails.totalDue - loanDetails.totalPaid, loanDetails.loan.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Next Installment Due: {formatCurrency(loanDetails.nextInstallment.totalDue, loanDetails.loan.currency)}
                      </p>
                    </div>

                    <Button
                      onClick={() => loanDetails.nextInstallment && makePaymentMutation.mutate(loanDetails.nextInstallment.id)}
                      disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || makePaymentMutation.isPending}
                      className="w-full"
                      data-testid="button-make-payment"
                    >
                      {makePaymentMutation.isPending ? t('common.processing') : 'Submit Payment for Approval'}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card data-testid="card-loan-history">
            <CardHeader>
              <CardTitle>{t('credit.loanHistory')}</CardTitle>
              <CardDescription>{t('credit.loanHistoryDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {loans.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t('credit.noLoans')}</p>
              ) : (
                <div className="space-y-4">
                  {loans.map((loan) => (
                    <LoanHistoryItem
                      key={loan.id}
                      loan={loan}
                      isExpanded={expandedLoanId === loan.id}
                      onToggle={() => setExpandedLoanId(expandedLoanId === loan.id ? null : loan.id)}
                      currency={currency}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
