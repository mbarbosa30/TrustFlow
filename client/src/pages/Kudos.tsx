import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAccount, useSignMessage } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Coins, Send, TrendingUp, Clock, Users, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { KudosBalance, KudosTransfer } from "@shared/schema";

export default function Kudos() {
  const { address } = useAccount();
  const { toast } = useToast();
  const { signMessageAsync } = useSignMessage();

  const [sendAmount, setSendAmount] = useState("");
  const [sendTo, setSendTo] = useState("");
  const [sendNote, setSendNote] = useState("");

  // Fetch user balance
  const { data: balance, isLoading: balanceLoading } = useQuery<KudosBalance>({
    queryKey: address ? [`/api/kudos/balance/${address.toLowerCase()}`] : ["no-balance"],
    enabled: !!address,
  });

  // Fetch can claim status
  const { data: canClaim } = useQuery<{
    canClaim: boolean;
    reason?: string;
    nextClaimDate?: string;
    claimableAmount?: number;
    localHealthScore?: number;
  }>({
    queryKey: address ? [`/api/kudos/can-claim/${address.toLowerCase()}`] : ["no-claim"],
    enabled: !!address,
  });

  // Fetch transfer history
  const { data: transfers = [], isLoading: transfersLoading } = useQuery<KudosTransfer[]>({
    queryKey: address ? [`/api/kudos/transfers/${address.toLowerCase()}`] : ["no-transfers"],
    enabled: !!address,
  });

  // Fetch global feed
  const { data: globalFeed = [] } = useQuery<KudosTransfer[]>({
    queryKey: ["/api/kudos/feed"],
  });

  // Fetch daily stats
  const { data: stats } = useQuery<{
    date: string;
    stats: any;
    availableClaim: number;
  }>({
    queryKey: ["/api/kudos/stats/daily"],
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (params: { toAddress: string; amount: number; note?: string }) => {
      const message = `Transfer ${params.amount} KUDOS to ${params.toAddress.toLowerCase()}`;
      const signature = await signMessageAsync({ message });

      const response = await apiRequest("POST", "/api/kudos/transfer", {
        fromAddress: address,
        toAddress: params.toAddress,
        amount: params.amount,
        note: params.note,
        signature,
      });
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      if (address) {
        queryClient.invalidateQueries({ queryKey: [`/api/kudos/balance/${address.toLowerCase()}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/kudos/transfers/${address.toLowerCase()}`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/kudos/feed"] });
      toast({
        title: "Transfer successful",
        description: "KUDOS sent successfully",
      });
      setSendAmount("");
      setSendTo("");
      setSendNote("");
    },
    onError: (error: any) => {
      toast({
        title: "Transfer failed",
        description: error.message || "Failed to send KUDOS",
        variant: "destructive",
      });
    },
  });

  // Claim mutation
  const claimMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/kudos/claim", {
        address,
      });
      const data = await response.json();
      return data;
    },
    onSuccess: (data: any) => {
      if (address) {
        queryClient.invalidateQueries({ queryKey: [`/api/kudos/balance/${address.toLowerCase()}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/kudos/can-claim/${address.toLowerCase()}`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/kudos/stats/daily"] });
      toast({
        title: "Claim successful",
        description: `Claimed ${data.claimed.toFixed(2)} KUDOS (Ego Score: ${data.localHealthScore?.toFixed(1) || 'N/A'})`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Claim failed",
        description: error.message || "Failed to claim KUDOS",
        variant: "destructive",
      });
    },
  });

  const handleTransfer = () => {
    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid positive amount",
        variant: "destructive",
      });
      return;
    }

    if (!sendTo || !sendTo.startsWith("0x")) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid Ethereum address",
        variant: "destructive",
      });
      return;
    }

    transferMutation.mutate({
      toAddress: sendTo,
      amount,
      note: sendNote || undefined,
    });
  };

  const handleClaim = () => {
    claimMutation.mutate();
  };

  if (!address) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>
              Connect your wallet to access the KUDOS token economy
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">KUDOS Economy</h1>
        <p className="text-muted-foreground">
          Off-chain reputation tokens earned through trust
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card data-testid="card-balance">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Balance</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-balance">
              {balanceLoading ? "..." : balance?.balance.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">KUDOS</p>
          </CardContent>
        </Card>

        <Card data-testid="card-claimed">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claimed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-claimed">
              {balance?.totalClaimed.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              From {balance?.lastClaimAt ? "last claim" : "never claimed"}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-available">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Available</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-available">
              {stats?.availableClaim.toFixed(2) || "1000.00"}
            </div>
            <p className="text-xs text-muted-foreground">KUDOS remaining today</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-claim">
          <CardHeader>
            <CardTitle>Claim KUDOS</CardTitle>
            <CardDescription>
              Claim tokens daily based on your Ego Score (score² / 100)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canClaim?.canClaim ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-md space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Ego Score</span>
                    <span className="text-lg font-bold" data-testid="text-ego-score">
                      {canClaim.localHealthScore?.toFixed(1) || "0.0"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Claimable Amount</span>
                    <span className="text-2xl font-bold text-primary" data-testid="text-claimable">
                      {canClaim.claimableAmount?.toFixed(2) || "0.00"} KUDOS
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    Formula: (EgoScore² / 100) capped by daily availability
                  </p>
                </div>
                <Button
                  onClick={handleClaim}
                  disabled={claimMutation.isPending}
                  className="w-full"
                  data-testid="button-claim"
                >
                  {claimMutation.isPending ? "Claiming..." : "Claim KUDOS"}
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">{canClaim?.reason}</p>
                {canClaim?.nextClaimDate && (
                  <p className="text-sm font-medium mt-2">
                    Next claim:{" "}
                    {new Date(canClaim.nextClaimDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-send">
          <CardHeader>
            <CardTitle>Send KUDOS</CardTitle>
            <CardDescription>
              Transfer KUDOS to boost edge capacity (1% fee: 0.5% burned, 0.5% pooled)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient" data-testid="label-recipient">
                Recipient Address
              </Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                data-testid="input-recipient"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount" data-testid="label-amount">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                data-testid="input-amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note" data-testid="label-note">
                Note (optional)
              </Label>
              <Textarea
                id="note"
                placeholder="Add a note..."
                value={sendNote}
                onChange={(e) => setSendNote(e.target.value)}
                data-testid="input-note"
              />
            </div>
            <Button
              onClick={handleTransfer}
              disabled={transferMutation.isPending}
              className="w-full"
              data-testid="button-send"
            >
              <Send className="mr-2 h-4 w-4" />
              {transferMutation.isPending ? "Sending..." : "Send KUDOS"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-history">
          <CardHeader>
            <CardTitle>Your Activity</CardTitle>
            <CardDescription>Recent transfers and claims</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transfersLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : transfers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet</p>
              ) : (
                transfers.slice(0, 10).map((transfer) => (
                  <div
                    key={transfer.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-md"
                    data-testid={`transfer-${transfer.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {transfer.fromAddress.toLowerCase() === address.toLowerCase() ? (
                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-green-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {transfer.fromAddress.toLowerCase() === address.toLowerCase()
                            ? `To ${transfer.toAddress.slice(0, 8)}...`
                            : `From ${transfer.fromAddress.slice(0, 8)}...`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transfer.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {transfer.fromAddress.toLowerCase() === address.toLowerCase() ? "-" : "+"}
                        {transfer.amount.toFixed(2)}
                      </p>
                      {transfer.note && (
                        <p className="text-xs text-muted-foreground">{transfer.note}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-feed">
          <CardHeader>
            <CardTitle>Global Feed</CardTitle>
            <CardDescription>Recent network activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {globalFeed.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet</p>
              ) : (
                globalFeed.slice(0, 10).map((transfer) => (
                  <div
                    key={transfer.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-md"
                    data-testid={`feed-${transfer.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {transfer.fromAddress.slice(0, 8)}... → {transfer.toAddress.slice(0, 8)}
                          ...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transfer.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" data-testid={`badge-amount-${transfer.id}`}>
                      {transfer.amount.toFixed(2)} KUDOS
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-info">
        <CardHeader>
          <CardTitle>About KUDOS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">What are KUDOS?</h3>
            <p className="text-sm text-muted-foreground">
              KUDOS are off-chain reputation tokens that reflect your trust score. They create a
              closed-loop economy where sending tokens boosts edge capacity in the trust network,
              improving scores for recipients.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Economics</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Daily claiming based on Ego Score (score² / 100)</li>
              <li>• 1000 KUDOS daily cap across all users</li>
              <li>• 1% transfer fee: 0.5% burned (deflationary), 0.5% pooled</li>
              <li>• 24-hour cooldown between claims</li>
              <li>• Edge boosts decay exponentially (180-day halflife)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
