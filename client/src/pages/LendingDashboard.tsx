import { useParams } from "wouter";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Users, 
  HandHeart,
  Activity,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAccount } from "wagmi";

interface LendingStats {
  totalLoansCount: number;
  totalDisbursed: number;
  activeLoansCount: number;
  activeVolume: number;
  completedLoansCount: number;
  defaultedLoansCount: number;
  repaymentRate: number; // percentage
  defaultRate: number; // percentage
  totalIbdApplied: number;
  totalRaApplied: number;
  totalVouchersApplied: number;
  totalSubsidies: number;
  uniqueSupporters: number;
  totalSupporterContributions: number;
  ghiScore: number;
  ghiThreshold: number;
  lendingEnabled: boolean;
}

interface LendingActivity {
  id: number;
  type: "LOAN_CREATED" | "PAYMENT_MADE" | "IBD_APPLIED" | "RA_COVERED" | "LOAN_DEFAULTED" | "LOAN_COMPLETED";
  timestamp: string;
  description: string;
  amountUsdc?: number;
  borrowerAddress?: string;
  supporterAddress?: string;
}

export default function LendingDashboard() {
  const params = useParams();
  const communityId = parseInt(params.communityId || "0");
  const { address } = useAccount();
  const { toast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "approve" | "reject" | null;
    paymentId: number | null;
    amount: number | null;
    currency: string | null;
  }>({ open: false, action: null, paymentId: null, amount: null, currency: null });

  // Fetch community data to get currency
  const { data: communityData } = useQuery<{ community: any }>({
    queryKey: ["/api/communities", communityId],
  });

  const currency = communityData?.community?.currency || "USD";

  // Fetch lending statistics
  const { data: stats, isLoading: statsLoading } = useQuery<LendingStats>({
    queryKey: ["/api/lending/stats", communityId],
  });

  // Fetch recent lending activity
  const { data: activities, isLoading: activitiesLoading } = useQuery<LendingActivity[]>({
    queryKey: ["/api/lending/activity", communityId],
  });

  // Fetch pending payments
  const { data: pendingPaymentsData, isLoading: pendingPaymentsLoading } = useQuery<{ payments: any[] }>({
    queryKey: ["/api/lending/pending-payments", communityId],
  });

  const pendingPayments = pendingPaymentsData?.payments || [];

  // Approve payment mutation
  const approveMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      return apiRequest(
        "POST",
        `/api/lending/pending-payments/${paymentId}/approve`,
        { reviewerAddress: address }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lending/pending-payments", communityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/lending/activity", communityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/lending/stats", communityId] });
      toast({
        title: "Payment Approved",
        description: "The payment has been processed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve payment",
        variant: "destructive",
      });
    },
  });

  // Reject payment mutation
  const rejectMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      return apiRequest(
        "POST",
        `/api/lending/pending-payments/${paymentId}/reject`,
        { reviewerAddress: address }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lending/pending-payments", communityId] });
      toast({
        title: "Payment Rejected",
        description: "The payment has been rejected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject payment",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (payment: any) => {
    setConfirmDialog({
      open: true,
      action: "approve",
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
    });
  };

  const handleReject = (payment: any) => {
    setConfirmDialog({
      open: true,
      action: "reject",
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
    });
  };

  const confirmAction = () => {
    if (confirmDialog.paymentId && confirmDialog.action) {
      if (confirmDialog.action === "approve") {
        approveMutation.mutate(confirmDialog.paymentId);
      } else {
        rejectMutation.mutate(confirmDialog.paymentId);
      }
    }
    setConfirmDialog({ open: false, action: null, paymentId: null, amount: null, currency: null });
  };

  if (statsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">Loading lending dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Lending Dashboard</CardTitle>
            <CardDescription>No lending data available for this community</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getActivityIcon = (type: LendingActivity["type"]) => {
    switch (type) {
      case "LOAN_CREATED":
        return <DollarSign className="h-4 w-4" />;
      case "PAYMENT_MADE":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "IBD_APPLIED":
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case "RA_COVERED":
        return <HandHeart className="h-4 w-4 text-purple-500" />;
      case "LOAN_DEFAULTED":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "LOAN_COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <DollarSign className="h-8 w-8 text-primary" />
            Lending Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Community #{communityId} Microcredit Economics
          </p>
        </div>
        <Badge variant={stats.lendingEnabled ? "default" : "secondary"} className="text-lg px-4 py-2">
          {stats.lendingEnabled ? "Lending Active" : "Lending Disabled"}
        </Badge>
      </div>

      <div className="space-y-6">
        {/* Health Gate Status */}
        <Card data-testid="card-health-gate">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Community Health Gate
          </CardTitle>
          <CardDescription>
            GHI threshold determines lending eligibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current GHI Score</span>
              <span className="text-2xl font-bold" data-testid="text-ghi-score">
                {stats.ghiScore.toFixed(1)}
              </span>
            </div>
            <Progress value={stats.ghiScore} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Threshold: {stats.ghiThreshold}
              </span>
              {stats.ghiScore >= stats.ghiThreshold ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Healthy
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Below Threshold
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loan Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-loans">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-loans">
              {stats.totalLoansCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalDisbursed, currency)} disbursed
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-active-loans">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-loans">
              {stats.activeLoansCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.activeVolume, currency)} outstanding
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-repayment-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repayment Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-repayment-rate">
              {stats.repaymentRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.completedLoansCount} completed
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-default-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Default Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-default-rate">
              {stats.defaultRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.defaultedLoansCount} defaulted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subsidy Statistics */}
      <Card data-testid="card-subsidy-stats">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandHeart className="h-5 w-5" />
            Subsidy Impact
          </CardTitle>
          <CardDescription>
            Supporter contributions reducing borrower costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium mb-3">Subsidy Breakdown</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Interest Buy-Down</span>
                  <span className="font-semibold" data-testid="text-ibd-applied">
                    {formatCurrency(stats.totalIbdApplied, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Repay-Assist</span>
                  <span className="font-semibold" data-testid="text-ra-applied">
                    {formatCurrency(stats.totalRaApplied, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Interest Vouchers</span>
                  <span className="font-semibold" data-testid="text-vouchers-applied">
                    {formatCurrency(stats.totalVouchersApplied, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Total Subsidies</span>
                  <span className="text-lg font-bold text-green-600" data-testid="text-total-subsidies">
                    {formatCurrency(stats.totalSubsidies, currency)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Supporter Participation</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Unique Supporters</span>
                  <span className="text-2xl font-bold" data-testid="text-unique-supporters">
                    {stats.uniqueSupporters}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Contributions</span>
                  <span className="font-semibold" data-testid="text-total-contributions">
                    {formatCurrency(stats.totalSupporterContributions, currency)}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {stats.uniqueSupporters > 0 
                      ? `${formatCurrency(stats.totalSupporterContributions / stats.uniqueSupporters, currency)} avg per supporter`
                      : "No supporters yet"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Payment Approvals */}
      {pendingPayments.filter((p: any) => p.status === 'PENDING').length > 0 && (
        <Card data-testid="card-pending-payments">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Pending Payment Approvals
              <Badge variant="secondary" data-testid="badge-pending-count">
                {pendingPayments.filter((p: any) => p.status === 'PENDING').length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Borrower payments awaiting management approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingPaymentsLoading ? (
              <p className="text-muted-foreground">Loading pending payments...</p>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Borrower</TableHead>
                      <TableHead className="whitespace-nowrap">Amount</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="whitespace-nowrap">Submitted</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayments
                      .filter((p: any) => p.status === 'PENDING')
                      .map((payment: any) => (
                        <TableRow key={payment.id} data-testid={`row-pending-${payment.id}`}>
                          <TableCell className="font-mono text-sm">
                            {payment.payerAddress.slice(0, 6)}...{payment.payerAddress.slice(-4)}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">
                              {formatCurrency(payment.amount, payment.currency)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {payment.notes || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(payment.submittedAt), "MMM d, h:mm a")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                data-testid={`button-approve-${payment.id}`}
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleApprove(payment)}
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                data-testid={`button-reject-${payment.id}`}
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleReject(payment)}
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                              >
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Feed */}
      <Card data-testid="card-activity-feed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Lending Activity
          </CardTitle>
          <CardDescription>
            Latest transactions and events in the lending system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <p className="text-muted-foreground">Loading activity...</p>
          ) : !activities || activities.length === 0 ? (
            <p className="text-muted-foreground">No recent lending activity</p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="whitespace-nowrap">Amount</TableHead>
                    <TableHead className="whitespace-nowrap">Time</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {activities.slice(0, 10).map((activity) => (
                  <TableRow key={activity.id} data-testid={`row-activity-${activity.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActivityIcon(activity.type)}
                        <span className="text-sm">{activity.type.replace(/_/g, " ")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {activity.description}
                    </TableCell>
                    <TableCell>
                      {activity.amountUsdc && (
                        <span className="font-semibold">
                          {formatCurrency(activity.amountUsdc, currency)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(activity.timestamp), "MMM d, h:mm a")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, action: null, paymentId: null, amount: null, currency: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "approve" ? "Approve Payment" : "Reject Payment"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "approve" ? (
                <>
                  Are you sure you want to approve this payment of{" "}
                  <strong>{formatCurrency(confirmDialog.amount || 0, confirmDialog.currency || currency)}</strong>?
                  This will process the payment and apply it to the loan.
                </>
              ) : (
                <>
                  Are you sure you want to reject this payment of{" "}
                  <strong>{formatCurrency(confirmDialog.amount || 0, confirmDialog.currency || currency)}</strong>?
                  The borrower will need to resubmit.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={confirmDialog.action === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {confirmDialog.action === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
