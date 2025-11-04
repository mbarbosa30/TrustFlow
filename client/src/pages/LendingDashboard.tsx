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

interface DashboardData {
  totalLoans: number;
  totalDisbursed: number;
  activeLoans: number;
  activeVolume: number;
  completedLoans: number;
  defaultedLoans: number;
  pendingApproval: number;
  repaymentRate: number;
  defaultRate: number;
  statusDistribution: {
    PENDING_APPROVAL: number;
    ACTIVE: number;
    PAID: number;
    DEFAULTED: number;
    REJECTED: number;
  };
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  atRiskLoans: Array<{
    loanId: number;
    borrowerAddress: string;
    principalUsdc: number;
    currency: string;
    disbursedAt: string;
    healthScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    paymentProgress: number;
    timeProgress: number;
  }>;
  atRiskCount: number;
  recentLoans: Array<{
    loanId: number;
    borrowerAddress: string;
    principalUsdc: number;
    currency: string;
    tenorMonths: number;
    disbursedAt: string;
    status: string;
  }>;
  lendingEnabled: boolean;
  ghiThreshold: number;
  currency: string;
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
    itemId: number | null;
    itemType: "payment" | "loan" | null;
    amount: number | null;
    currency: string | null;
    borrowerAddress?: string | null;
  }>({ open: false, action: null, itemId: null, itemType: null, amount: null, currency: null, borrowerAddress: null });

  // Fetch community data to get currency
  const { data: communityData } = useQuery<{ community: any }>({
    queryKey: ["/api/communities", communityId],
  });

  const currency = communityData?.community?.currency || "USD";

  // Fetch lending statistics
  const { data: stats, isLoading: statsLoading } = useQuery<LendingStats>({
    queryKey: ["/api/loans/stats", communityId],
  });

  // Fetch comprehensive dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ["/api/lending/dashboard", communityId],
  });

  // Fetch recent lending activity
  const { data: activities, isLoading: activitiesLoading} = useQuery<LendingActivity[]>({
    queryKey: ["/api/loans/activity", communityId],
  });

  // Fetch pending payments
  const { data: pendingPaymentsData, isLoading: pendingPaymentsLoading } = useQuery<{ payments: any[] }>({
    queryKey: ["/api/loans/pending-payments", communityId],
  });

  const pendingPayments = pendingPaymentsData?.payments || [];

  // Fetch pending loan applications
  const { data: loansData, isLoading: loansLoading } = useQuery<{ loans: any[] }>({
    queryKey: ["/api/loans/community", communityId],
  });

  const pendingLoans = (loansData?.loans || []).filter((loan: any) => loan.status === 'PENDING_APPROVAL');

  // Approve payment mutation
  const approveMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      return apiRequest(
        "POST",
        `/api/loans/pending-payments/${paymentId}/approve`,
        { reviewerAddress: address }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans/pending-payments", communityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/loans/activity", communityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/loans/stats", communityId] });
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
        `/api/loans/pending-payments/${paymentId}/reject`,
        { reviewerAddress: address }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans/pending-payments", communityId] });
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

  // Approve loan application mutation
  const approveLoanMutation = useMutation({
    mutationFn: async (loanId: number) => {
      return apiRequest(
        "POST",
        `/api/loans/${loanId}/approve`,
        { reviewerAddress: address }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans/community", communityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/loans/activity", communityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/loans/stats", communityId] });
      toast({
        title: "Loan Approved",
        description: "The loan application has been approved and activated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve loan application",
        variant: "destructive",
      });
    },
  });

  // Reject loan application mutation
  const rejectLoanMutation = useMutation({
    mutationFn: async (loanId: number) => {
      return apiRequest(
        "POST",
        `/api/loans/${loanId}/reject`,
        { reviewerAddress: address }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans/community", communityId] });
      toast({
        title: "Loan Rejected",
        description: "The loan application has been rejected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject loan application",
        variant: "destructive",
      });
    },
  });

  const handleApprovePayment = (payment: any) => {
    setConfirmDialog({
      open: true,
      action: "approve",
      itemId: payment.id,
      itemType: "payment",
      amount: payment.amount,
      currency: payment.currency,
    });
  };

  const handleRejectPayment = (payment: any) => {
    setConfirmDialog({
      open: true,
      action: "reject",
      itemId: payment.id,
      itemType: "payment",
      amount: payment.amount,
      currency: payment.currency,
    });
  };

  const handleApproveLoan = (loan: any) => {
    setConfirmDialog({
      open: true,
      action: "approve",
      itemId: loan.id,
      itemType: "loan",
      amount: loan.principalUsdc,
      currency: loan.currency,
      borrowerAddress: loan.borrowerAddress,
    });
  };

  const handleRejectLoan = (loan: any) => {
    setConfirmDialog({
      open: true,
      action: "reject",
      itemId: loan.id,
      itemType: "loan",
      amount: loan.principalUsdc,
      currency: loan.currency,
      borrowerAddress: loan.borrowerAddress,
    });
  };

  const confirmAction = () => {
    if (confirmDialog.itemId && confirmDialog.action && confirmDialog.itemType) {
      if (confirmDialog.itemType === "payment") {
        if (confirmDialog.action === "approve") {
          approveMutation.mutate(confirmDialog.itemId);
        } else {
          rejectMutation.mutate(confirmDialog.itemId);
        }
      } else if (confirmDialog.itemType === "loan") {
        if (confirmDialog.action === "approve") {
          approveLoanMutation.mutate(confirmDialog.itemId);
        } else {
          rejectLoanMutation.mutate(confirmDialog.itemId);
        }
      }
    }
    setConfirmDialog({ open: false, action: null, itemId: null, itemType: null, amount: null, currency: null, borrowerAddress: null });
  };

  if (statsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <p className="text-muted-foreground">Loading lending dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
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
    <div className="max-w-7xl mx-auto px-4 py-12">
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

      {/* Pending Loan Applications */}
      {pendingLoans.length > 0 && (
        <Card data-testid="card-pending-loans">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Pending Loan Applications
              <Badge variant="destructive" data-testid="badge-pending-loans-count">
                {pendingLoans.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              New loan applications awaiting approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loansLoading ? (
              <p className="text-muted-foreground">Loading loan applications...</p>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Borrower</TableHead>
                      <TableHead className="whitespace-nowrap">Amount</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>APR</TableHead>
                      <TableHead className="whitespace-nowrap">Applied</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingLoans.map((loan: any) => (
                      <TableRow key={loan.id} data-testid={`row-pending-loan-${loan.id}`}>
                        <TableCell className="font-mono text-sm">
                          {loan.borrowerAddress.slice(0, 6)}...{loan.borrowerAddress.slice(-4)}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            {formatCurrency(loan.principalUsdc, loan.currency)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {loan.tenorMonths} months
                        </TableCell>
                        <TableCell className="text-sm">
                          {(loan.aprNominal * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(loan.createdAt), "MMM d, h:mm a")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              data-testid={`button-approve-loan-${loan.id}`}
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleApproveLoan(loan)}
                              disabled={approveLoanMutation.isPending || rejectLoanMutation.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              data-testid={`button-reject-loan-${loan.id}`}
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleRejectLoan(loan)}
                              disabled={approveLoanMutation.isPending || rejectLoanMutation.isPending}
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
                                onClick={() => handleApprovePayment(payment)}
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                data-testid={`button-reject-${payment.id}`}
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleRejectPayment(payment)}
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

      {/* Loan Portfolio Analysis */}
      {dashboardData && !dashboardLoading && (
        <>
          {/* Status & Risk Distribution Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Status Distribution */}
            <Card data-testid="card-status-distribution">
              <CardHeader>
                <CardTitle>Loan Status Distribution</CardTitle>
                <CardDescription>Breakdown by current loan status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(dashboardData.statusDistribution).map(([status, count]) => {
                  const total = dashboardData.totalLoans || 1;
                  const percentage = (count / total) * 100;
                  const badgeVariant = status === 'PAID' ? 'default' : status === 'ACTIVE' ? 'secondary' : status === 'PENDING_APPROVAL' ? 'outline' : 'destructive';
                  
                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={badgeVariant} className="text-xs">
                            {status.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{count} loans</span>
                        </div>
                        <span className="text-sm font-medium">{percentage.toFixed(0)}%</span>
                      </div>
                      <Progress value={percentage} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Risk Distribution */}
            <Card data-testid="card-risk-distribution">
              <CardHeader>
                <CardTitle>Risk Assessment Distribution</CardTitle>
                <CardDescription>Active loans by health risk level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(dashboardData.riskDistribution).map(([risk, count]) => {
                  const total = dashboardData.activeLoans || 1;
                  const percentage = (count / total) * 100;
                  const badgeVariant = risk === 'low' ? 'default' : risk === 'medium' ? 'secondary' : 'destructive';
                  
                  return (
                    <div key={risk} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={badgeVariant} className="text-xs">
                            {risk.toUpperCase()} RISK
                          </Badge>
                          <span className="text-sm text-muted-foreground">{count} loans</span>
                        </div>
                        <span className="text-sm font-medium">{percentage.toFixed(0)}%</span>
                      </div>
                      <Progress value={percentage} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* At-Risk Loans Table */}
          {dashboardData.atRiskLoans.length > 0 && (
            <Card data-testid="card-at-risk-loans">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  At-Risk Loans
                  <Badge variant="destructive" data-testid="badge-at-risk-count">
                    {dashboardData.atRiskCount}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Active loans with payments falling behind schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-6 px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Loan ID</TableHead>
                        <TableHead className="whitespace-nowrap">Borrower</TableHead>
                        <TableHead className="whitespace-nowrap">Amount</TableHead>
                        <TableHead className="whitespace-nowrap">Health Score</TableHead>
                        <TableHead className="whitespace-nowrap">Payment Progress</TableHead>
                        <TableHead className="whitespace-nowrap">Time Elapsed</TableHead>
                        <TableHead className="whitespace-nowrap">Risk Level</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData.atRiskLoans.map((loan) => (
                        <TableRow key={loan.loanId} data-testid={`row-at-risk-${loan.loanId}`}>
                          <TableCell className="font-medium">#{loan.loanId}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {loan.borrowerAddress.slice(0, 6)}...{loan.borrowerAddress.slice(-4)}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(loan.principalUsdc, loan.currency)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{loan.healthScore.toFixed(1)}/100</span>
                              <Progress value={loan.healthScore} className="w-16 h-2" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{Math.round(loan.paymentProgress)}%</span>
                              <Progress value={loan.paymentProgress} className="w-16 h-2" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {Math.round(loan.timeProgress)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                loan.riskLevel === 'medium' ? 'secondary' : 
                                loan.riskLevel === 'high' ? 'destructive' : 
                                'default'
                              }
                              className="gap-1"
                            >
                              {loan.riskLevel === 'medium' && <AlertCircle className="h-3 w-3" />}
                              {(loan.riskLevel === 'high' || loan.riskLevel === 'critical') && <AlertTriangle className="h-3 w-3" />}
                              {loan.riskLevel.toUpperCase()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
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
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, action: null, itemId: null, itemType: null, amount: null, currency: null, borrowerAddress: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.itemType === "loan" 
                ? (confirmDialog.action === "approve" ? "Approve Loan Application" : "Reject Loan Application")
                : (confirmDialog.action === "approve" ? "Approve Payment" : "Reject Payment")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.itemType === "loan" ? (
                confirmDialog.action === "approve" ? (
                  <>
                    Are you sure you want to approve this loan application for{" "}
                    <strong>{formatCurrency(confirmDialog.amount || 0, confirmDialog.currency || currency)}</strong>?
                    This will activate the loan and make it ready for disbursement.
                  </>
                ) : (
                  <>
                    Are you sure you want to reject this loan application for{" "}
                    <strong>{formatCurrency(confirmDialog.amount || 0, confirmDialog.currency || currency)}</strong>?
                    The applicant will be notified.
                  </>
                )
              ) : (
                confirmDialog.action === "approve" ? (
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
                )
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
