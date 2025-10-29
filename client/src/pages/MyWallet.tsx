import { useState } from "react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, Send, Download, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MyWallet() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [communityId] = useState(0); // Default to Community 0 (global)
  const [payAmount, setPayAmount] = useState("");
  const [payMerchant, setPayMerchant] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  // Fetch user's trust score
  const { data: scoreData, isLoading: isLoadingScore } = useQuery<{
    score: {
      sts: number;
      tier: string;
      percentile: number;
      flow: number;
      minCut: number;
      stability: number;
      depth: number;
      pageRank: number;
      isAccepted: boolean;
    };
  }>({
    queryKey: [`/api/score/${address}`],
    enabled: Boolean(address),
  });

  // Fetch user's allowance
  const { data: allowanceData, isLoading: isLoadingAllowance } = useQuery<{
    allowance: {
      allowanceAmount: number;
      claimedToday: number;
      share: number;
      cap: number;
      epochId: number;
    };
  }>({
    queryKey: [`/api/allowance/${communityId}/${address}`],
    enabled: Boolean(address),
  });

  // Fetch budget info
  const { data: budgetData } = useQuery<{
    budget: {
      dailyBudget: number;
      rho: number;
      treasuryRemaining: number;
    };
  }>({
    queryKey: [`/api/budget/${communityId}`],
  });

  // Fetch payment history
  const { data: paymentsData } = useQuery<{
    payments: Array<{
      id: number;
      payeeAddress: string;
      amount: number;
      status: string;
      memo: string;
      createdAt: Date;
      source: string;
    }>;
  }>({
    queryKey: [`/api/payments/${address}`],
    enabled: Boolean(address),
  });

  const handleClaim = async () => {
    if (!address) return;
    
    setIsClaiming(true);
    try {
      const result = await apiRequest(`/api/claim`, "POST", {
        communityId,
        userAddress: address,
      });

      toast({
        title: "Claim Approved!",
        description: `${allowanceData?.allowance.allowanceAmount.toFixed(2)} USDC has been approved for withdrawal.`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/allowance/${communityId}/${address}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/payments/${address}`] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Claim Failed",
        description: error.error || "Failed to claim allowance",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handlePay = async () => {
    if (!address || !payMerchant || !payAmount) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Please enter both merchant address and amount",
      });
      return;
    }

    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid positive amount",
      });
      return;
    }

    setIsPaying(true);
    try {
      const result = await apiRequest(`/api/pay`, "POST", {
        communityId,
        userAddress: address,
        merchantAddress: payMerchant,
        amount,
        memo: `Payment to merchant`,
      });

      toast({
        title: "Payment Approved!",
        description: `${amount.toFixed(2)} USDC has been approved for ${payMerchant.slice(0, 10)}...`,
      });

      // Clear form and refresh
      setPayAmount("");
      setPayMerchant("");
      queryClient.invalidateQueries({ queryKey: [`/api/allowance/${communityId}/${address}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/payments/${address}`] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: error.error || "Failed to process payment",
      });
    } finally {
      setIsPaying(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
              <p className="text-muted-foreground">
                Please connect your wallet to view your trust score and allowance
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remainingAllowance = allowanceData ? 
    allowanceData.allowance.allowanceAmount - allowanceData.allowance.claimedToday : 0;
  const utilizationPercent = allowanceData ?
    (allowanceData.allowance.claimedToday / allowanceData.allowance.allowanceAmount) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Wallet</h1>
        <p className="text-muted-foreground">
          Your trust score, daily allowance, and payment activity
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Trust Score Card */}
        <Card data-testid="card-trust-score">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trust Score
            </CardTitle>
            <CardDescription>
              Your Standardized Trust Score (STS) in the network
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingScore ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading trust score...
              </div>
            ) : scoreData?.score ? (
              <div className="space-y-4">
                <div className="flex items-baseline gap-4">
                  <div className="text-5xl font-bold font-mono" data-testid="text-sts-score">
                    {scoreData.score.sts.toFixed(2)}
                  </div>
                  <div>
                    <Badge variant={
                      scoreData.score.tier === "Trusted" ? "default" :
                      scoreData.score.tier === "Verified" ? "secondary" : 
                      "outline"
                    } data-testid="badge-tier">
                      {scoreData.score.tier || "Unranked"}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      Top {(100 - scoreData.score.percentile).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Flow (55%)</span>
                    <span className="font-mono">{scoreData.score.flow.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Min-Cut (25%)</span>
                    <span className="font-mono">{scoreData.score.minCut.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stability (5%)</span>
                    <span className="font-mono">{scoreData.score.stability.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Depth (10%)</span>
                    <span className="font-mono">{scoreData.score.depth.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">PageRank (5%)</span>
                    <span className="font-mono">{scoreData.score.pageRank.toFixed(2)}</span>
                  </div>
                </div>

                {!scoreData.score.isAccepted && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      You need to build more trust connections to qualify for economic benefits.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No trust score available. Build connections to get scored!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wallet Balance Card */}
        <Card data-testid="card-wallet">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Daily Allowance
            </CardTitle>
            <CardDescription>
              Your daily USDC allocation based on trust score
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAllowance ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading allowance...
              </div>
            ) : allowanceData?.allowance ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <div className="text-4xl font-bold font-mono" data-testid="text-remaining">
                      ${remainingAllowance.toFixed(2)}
                    </div>
                    <div className="text-muted-foreground">/ ${allowanceData.allowance.allowanceAmount.toFixed(2)}</div>
                  </div>
                  <p className="text-sm text-muted-foreground">Available today</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Utilized</span>
                    <span>{utilizationPercent.toFixed(0)}%</span>
                  </div>
                  <Progress value={utilizationPercent} />
                </div>

                <div className="pt-2 space-y-2">
                  <Button 
                    onClick={handleClaim}
                    disabled={remainingAllowance <= 0 || isClaiming}
                    className="w-full"
                    data-testid="button-claim"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isClaiming ? "Processing..." : `Claim ${remainingAllowance > 0 ? `$${remainingAllowance.toFixed(2)}` : "Allowance"}`}
                  </Button>

                  {budgetData && (
                    <div className="text-xs text-muted-foreground text-center pt-2">
                      Community budget: ${budgetData.budget.dailyBudget.toFixed(2)}/day
                      ({(budgetData.budget.rho * 100).toFixed(2)}% of ${budgetData.budget.treasuryRemaining.toFixed(0)} treasury)
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No allowance available. Build trust to qualify!
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pay Merchant Section */}
      {allowanceData?.allowance && remainingAllowance > 0 && (
        <Card className="mb-6" data-testid="card-pay">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Pay Merchant
            </CardTitle>
            <CardDescription>
              Send USDC from your allowance to a merchant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant Address</Label>
                <Input
                  id="merchant"
                  placeholder="0x..."
                  value={payMerchant}
                  onChange={(e) => setPayMerchant(e.target.value)}
                  data-testid="input-merchant"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USDC)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  step="0.01"
                  max={Math.min(remainingAllowance, 5)}
                  data-testid="input-amount"
                />
              </div>
              <div className="sm:col-span-2">
                <Button 
                  onClick={handlePay}
                  disabled={!payMerchant || !payAmount || isPaying}
                  className="w-full"
                  data-testid="button-pay"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isPaying ? "Processing..." : "Send Payment"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Maximum per transaction: $5.00 USDC
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card data-testid="card-activity">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            Recent claims and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsData?.payments && paymentsData.payments.length > 0 ? (
            <div className="space-y-3">
              {paymentsData.payments.slice(0, 10).map((payment) => (
                <div 
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-md border"
                  data-testid={`payment-${payment.id}`}
                >
                  <div className="flex items-center gap-3">
                    {payment.status === "CONFIRMED" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : payment.status === "FAILED" ? (
                      <XCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <div className="font-medium">
                        {payment.memo || `Payment to ${payment.payeeAddress.slice(0, 10)}...`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleDateString()} • {payment.source}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold">
                      ${payment.amount.toFixed(2)}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No payment history yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
