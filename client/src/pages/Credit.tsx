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
import { useState } from "react";

export default function Credit() {
  const { address } = useAccount();
  const { toast } = useToast();
  const [selectedAmount, setSelectedAmount] = useState<number>(160);
  const [selectedTenor, setSelectedTenor] = useState<number>(6);
  const [paymentAmount, setPaymentAmount] = useState<string>("");

  const communityId = 0; // Global community

  // Check loan eligibility
  const { data: eligibility, isLoading: loadingEligibility } = useQuery({
    queryKey: [`/api/loans/eligibility/${communityId}/${address}`],
    enabled: !!address,
  });

  // Get user's loans
  const { data: loansData, isLoading: loadingLoans } = useQuery({
    queryKey: [`/api/loans/borrower/${communityId}/${address}`],
    enabled: !!address,
  });

  const loans = loansData?.loans || [];
  const activeLoan = loans.find((l: any) => l.status === "ACTIVE");

  // Get active loan details
  const { data: loanDetails } = useQuery({
    queryKey: [`/api/loans/${activeLoan?.id}`],
    enabled: !!activeLoan,
  });

  // Create loan mutation
  const createLoanMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/loans/${communityId}`, {
        method: "POST",
        body: JSON.stringify({
          userAddress: address,
          amountUsdc: selectedAmount,
          tenorMonths: selectedTenor,
        }),
      });
    },
    onSuccess: () => {
      toast({ title: "Loan created successfully!", description: "Your loan has been disbursed" });
      queryClient.invalidateQueries({ queryKey: [`/api/loans/borrower/${communityId}/${address}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/loans/eligibility/${communityId}/${address}`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create loan", description: error.message, variant: "destructive" });
    },
  });

  // Make payment mutation
  const makePaymentMutation = useMutation({
    mutationFn: async (installmentId: number) => {
      return apiRequest(`/api/loans/${activeLoan.id}/pay`, {
        method: "POST",
        body: JSON.stringify({
          installmentId,
          amountUsdc: parseFloat(paymentAmount),
          payerAddress: address,
        }),
      });
    },
    onSuccess: () => {
      toast({ title: "Payment successful!", description: "Your payment has been processed" });
      setPaymentAmount("");
      queryClient.invalidateQueries({ queryKey: [`/api/loans/${activeLoan?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/loans/borrower/${communityId}/${address}`] });
    },
    onError: (error: any) => {
      toast({ title: "Payment failed", description: error.message, variant: "destructive" });
    },
  });

  if (!address) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-[400px]" data-testid="card-connect-wallet">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>Please connect your wallet to access credit</CardDescription>
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
          <p>Loading credit information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6" data-testid="page-credit">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credit</h1>
          <p className="text-muted-foreground">Access microcredit loans based on your trust score</p>
        </div>
      </div>

      <Tabs defaultValue={activeLoan ? "active" : "apply"}>
        <TabsList data-testid="tabs-credit">
          <TabsTrigger value="apply" data-testid="tab-apply">
            Apply for Loan
          </TabsTrigger>
          {activeLoan && (
            <TabsTrigger value="active" data-testid="tab-active-loan">
              Active Loan
            </TabsTrigger>
          )}
          <TabsTrigger value="history" data-testid="tab-history">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apply" className="space-y-4">
          {/* Eligibility Card */}
          <Card data-testid="card-eligibility">
            <CardHeader>
              <CardTitle>Loan Eligibility</CardTitle>
              <CardDescription>Check if you qualify for a microcredit loan</CardDescription>
            </CardHeader>
            <CardContent>
              {eligibility?.eligible ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">You are eligible for a loan!</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Available loan amounts:</p>
                    <div className="flex flex-wrap gap-2">
                      {eligibility.amounts?.map((amount: number) => (
                        <Badge key={amount} variant="secondary" data-testid={`badge-amount-${amount}`}>
                          ${amount} USDC
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">Not eligible for a loan</span>
                  </div>
                  {eligibility?.reasons?.map((reason: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loan Application Form */}
          {eligibility?.eligible && !activeLoan && (
            <Card data-testid="card-loan-application">
              <CardHeader>
                <CardTitle>Apply for Loan</CardTitle>
                <CardDescription>Select loan amount and repayment period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Loan Amount (USDC)</Label>
                  <Select
                    value={selectedAmount.toString()}
                    onValueChange={(v) => setSelectedAmount(parseInt(v))}
                  >
                    <SelectTrigger id="amount" data-testid="select-loan-amount">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibility.amounts?.map((amount: number) => (
                        <SelectItem key={amount} value={amount.toString()}>
                          ${amount} USDC (≈ ${amount * 1000} ARS)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenor">Repayment Period</Label>
                  <Select value={selectedTenor.toString()} onValueChange={(v) => setSelectedTenor(parseInt(v))}>
                    <SelectTrigger id="tenor" data-testid="select-tenor">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 months</SelectItem>
                      <SelectItem value="9">9 months</SelectItem>
                      <SelectItem value="12">12 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={() => createLoanMutation.mutate()}
                    disabled={createLoanMutation.isPending}
                    className="w-full"
                    data-testid="button-apply-loan"
                  >
                    {createLoanMutation.isPending ? "Processing..." : "Apply for Loan"}
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
                  <CardTitle>Active Loan</CardTitle>
                  <CardDescription>
                    ${loanDetails.loan.principalUsdc} USDC • {loanDetails.loan.tenorMonths} months •{" "}
                    {(loanDetails.loan.aprNominal * 100).toFixed(0)}% APR
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Repayment Progress</span>
                    <span className="text-sm font-medium">
                      ${loanDetails.totalPaid.toFixed(2)} / ${loanDetails.totalDue.toFixed(2)}
                    </span>
                  </div>
                  <Progress value={(loanDetails.totalPaid / loanDetails.totalDue) * 100} />

                  {loanDetails.nextInstallment && (
                    <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                      <DollarSign className="h-5 w-5" />
                      <div>
                        <p className="font-medium">Next Payment</p>
                        <p className="text-sm text-muted-foreground">
                          ${loanDetails.nextInstallment.totalDue.toFixed(2)} due on{" "}
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
                    <CardTitle>Make Payment</CardTitle>
                    <CardDescription>Pay your next installment</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment">Payment Amount (USDC)</Label>
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
                      onClick={() => makePaymentMutation.mutate(loanDetails.nextInstallment.id)}
                      disabled={!paymentAmount || makePaymentMutation.isPending}
                      className="w-full"
                      data-testid="button-make-payment"
                    >
                      {makePaymentMutation.isPending ? "Processing..." : "Make Payment"}
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
              <CardTitle>Loan History</CardTitle>
              <CardDescription>Your past and current loans</CardDescription>
            </CardHeader>
            <CardContent>
              {loans.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No loans yet</p>
              ) : (
                <div className="space-y-4">
                  {loans.map((loan: any) => (
                    <div
                      key={loan.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                      data-testid={`loan-${loan.id}`}
                    >
                      <div>
                        <p className="font-medium">${loan.principalUsdc} USDC</p>
                        <p className="text-sm text-muted-foreground">
                          {loan.tenorMonths} months • {(loan.aprNominal * 100).toFixed(0)}% APR
                        </p>
                      </div>
                      <Badge variant={loan.status === "PAID" ? "default" : loan.status === "ACTIVE" ? "secondary" : "destructive"}>
                        {loan.status}
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
