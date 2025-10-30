import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
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

  // Fetch lending statistics
  const { data: stats, isLoading: statsLoading } = useQuery<LendingStats>({
    queryKey: ["/api/lending/stats", communityId],
  });

  // Fetch recent lending activity
  const { data: activities, isLoading: activitiesLoading } = useQuery<LendingActivity[]>({
    queryKey: ["/api/lending/activity", communityId],
  });

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
              ${stats.totalDisbursed.toFixed(2)} disbursed
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
              ${stats.activeVolume.toFixed(2)} outstanding
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
                    ${stats.totalIbdApplied.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Repay-Assist</span>
                  <span className="font-semibold" data-testid="text-ra-applied">
                    ${stats.totalRaApplied.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Interest Vouchers</span>
                  <span className="font-semibold" data-testid="text-vouchers-applied">
                    ${stats.totalVouchersApplied.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Total Subsidies</span>
                  <span className="text-lg font-bold text-green-600" data-testid="text-total-subsidies">
                    ${stats.totalSubsidies.toFixed(2)}
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
                    ${stats.totalSupporterContributions.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {stats.uniqueSupporters > 0 
                      ? `$${(stats.totalSupporterContributions / stats.uniqueSupporters).toFixed(2)} avg per supporter`
                      : "No supporters yet"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                          ${activity.amountUsdc.toFixed(2)}
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
    </div>
  );
}
