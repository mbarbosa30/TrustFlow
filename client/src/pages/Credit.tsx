import { useQuery, useMutation } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle2, XCircle, Clock, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import type { WalletProfile } from "@shared/schema";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Credit() {
  const { address } = useAccount();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [selectedAmount, setSelectedAmount] = useState<number>(160000); // Default 160k ARS
  const [selectedTenor, setSelectedTenor] = useState<number>(6);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [borrowerName, setBorrowerName] = useState("");

  const communityId = 0; // Global community

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
  const { data: eligibility, isLoading: loadingEligibility } = useQuery<{
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
  }>({
    queryKey: [`/api/loans/eligibility/${communityId}/${address}`],
    enabled: !!address,
  });

  // Get user's loans
  const { data: loansData, isLoading: loadingLoans } = useQuery<{ loans: any[] }>({
    queryKey: [`/api/loans/borrower/${communityId}/${address}`],
    enabled: !!address,
  });

  const loans = loansData?.loans || [];
  const activeLoan = loans.find((l: any) => l.status === "ACTIVE");

  // Get active loan details
  const { data: loanDetails } = useQuery<{
    loan: {
      id: number;
      principalUsdc: number;
      tenorMonths: number;
      aprNominal: number;
      status: string;
    };
    totalPaid: number;
    totalDue: number;
    nextInstallment?: {
      id: number;
      dueDate: string;
      totalDue: number;
    };
  }>({
    queryKey: [`/api/loans/${activeLoan?.id}`],
    enabled: !!activeLoan,
  });

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
          amountUsdc: selectedAmount,
          tenorMonths: selectedTenor,
          currency: 'ARS', // Default to ARS for Argentine market
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

  // Make payment mutation
  const makePaymentMutation = useMutation({
    mutationFn: async (installmentId: number) => {
      const response = await fetch(`/api/loans/${activeLoan.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installmentId,
          amountUsdc: parseFloat(paymentAmount),
          payerAddress: address,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Payment failed");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: t('credit.paymentSuccess'), description: t('credit.paymentProcessed') });
      setPaymentAmount("");
      queryClient.invalidateQueries({ queryKey: [`/api/loans/${activeLoan?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/loans/borrower/${communityId}/${address}`] });
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

  if (loadingEligibility || loadingLoans) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p>{t('credit.loadingInfo')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6" data-testid="page-credit">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('credit.title')}</h1>
          <p className="text-muted-foreground">{t('credit.description')}</p>
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
          {/* Trust Profile Card (Advisory Only) */}
          <Card data-testid="card-trust-profile">
            <CardHeader>
              <CardTitle>{t('credit.trustProfile')}</CardTitle>
              <CardDescription>{t('credit.trustProfileDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {eligibility?.trustMetrics ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{t('credit.sybilResistance')}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" data-testid="badge-mincut">
                          Min-Cut: {eligibility.trustMetrics.minCut || 0}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{t('credit.healthIndex')}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" data-testid="badge-ghi">
                          GHI: {eligibility.trustMetrics.ghi || 0}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {eligibility.trustMetrics.isAccepted && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">{t('credit.endorsedMember')}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground italic">
                    {t('credit.metricsAdvisory')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{t('credit.noMetrics')}</p>
                  <p className="text-xs text-muted-foreground italic">
                    {t('credit.noMetricsInfo')}
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
                <CardDescription>{t('credit.applyLoanDesc')}</CardDescription>
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
                  <Label htmlFor="amount">{t('credit.loanAmount')}</Label>
                  <Select
                    value={selectedAmount.toString()}
                    onValueChange={(v) => setSelectedAmount(parseInt(v))}
                  >
                    <SelectTrigger id="amount" data-testid="select-loan-amount">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[160000, 240000, 400000, 600000, 800000].map((amount: number) => (
                        <SelectItem key={amount} value={amount.toString()}>
                          ${(amount / 1000).toFixed(0)}k ARS
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenor">{t('credit.paymentTerm')}</Label>
                  <Select value={selectedTenor.toString()} onValueChange={(v) => setSelectedTenor(parseInt(v))}>
                    <SelectTrigger id="tenor" data-testid="select-tenor">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 {t('common.months')}</SelectItem>
                      <SelectItem value="9">9 {t('common.months')}</SelectItem>
                      <SelectItem value="12">12 {t('common.months')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={() => createLoanMutation.mutate()}
                    disabled={createLoanMutation.isPending || !borrowerName.trim()}
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
              {/* Loan Overview */}
              <Card data-testid="card-loan-overview">
                <CardHeader>
                  <CardTitle>{t('credit.activeLoan')}</CardTitle>
                  <CardDescription>
                    ${(loanDetails.loan.principalUsdc / 1000).toFixed(0)}k ARS • {loanDetails.loan.tenorMonths} {t('common.months')} •{" "}
                    {(loanDetails.loan.aprNominal * 100).toFixed(0)}% TNA
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('credit.paymentProgress')}</span>
                    <span className="text-sm font-medium">
                      ${(loanDetails.totalPaid / 1000).toFixed(1)}k / ${(loanDetails.totalDue / 1000).toFixed(1)}k ARS
                    </span>
                  </div>
                  <Progress value={(loanDetails.totalPaid / loanDetails.totalDue) * 100} />

                  {loanDetails.nextInstallment && (
                    <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                      <DollarSign className="h-5 w-5" />
                      <div>
                        <p className="font-medium">{t('credit.nextPayment')}</p>
                        <p className="text-sm text-muted-foreground">
                          ${(loanDetails.nextInstallment.totalDue / 1000).toFixed(1)}k ARS {t('credit.dueOn')}{" "}
                          {new Date(loanDetails.nextInstallment.dueDate).toLocaleDateString('es-AR')}
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
                    <CardDescription>{t('credit.makePaymentDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment">{t('credit.paymentAmountARS')}</Label>
                      <Input
                        id="payment"
                        type="number"
                        placeholder="0.00"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        data-testid="input-payment-amount"
                      />
                    </div>

                    <Button
                      onClick={() => loanDetails.nextInstallment && makePaymentMutation.mutate(loanDetails.nextInstallment.id)}
                      disabled={!paymentAmount || makePaymentMutation.isPending}
                      className="w-full"
                      data-testid="button-make-payment"
                    >
                      {makePaymentMutation.isPending ? t('common.processing') : t('credit.makePaymentButton')}
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
                  {loans.map((loan: any) => (
                    <div
                      key={loan.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                      data-testid={`loan-${loan.id}`}
                    >
                      <div>
                        <p className="font-medium">${(loan.principalUsdc / 1000).toFixed(0)}k {loan.currency || 'ARS'}</p>
                        <p className="text-sm text-muted-foreground">
                          {loan.tenorMonths} {t('common.months')} • {(loan.aprNominal * 100).toFixed(0)}% TNA
                        </p>
                      </div>
                      <Badge variant={loan.status === "PAID" ? "default" : loan.status === "ACTIVE" ? "secondary" : "destructive"}>
                        {loan.status === "PAID" ? t('credit.statusPaid') : loan.status === "ACTIVE" ? t('credit.statusActive') : t('credit.statusDefault')}
                      </Badge>
                    </div>
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
