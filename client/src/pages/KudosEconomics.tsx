import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Coins, Flame, Droplet } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface EconomicsData {
  totalSupply: number;
  totalBurned: number;
  poolAmount: number;
  dailyStats: Array<{
    date: string;
    totalMinted: number;
    totalBurned: number;
    transferVolume: number;
  }>;
  topHolders: Array<{
    address: string;
    balance: number;
    totalClaimed: number;
    totalSent: number;
    totalReceived: number;
  }>;
}

export default function KudosEconomics() {
  const { data: economics, isLoading } = useQuery<EconomicsData>({
    queryKey: ["/api/kudos/economics"],
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!economics) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load economics data</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const chartData = economics.dailyStats.map((stat) => ({
    date: new Date(stat.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    minted: stat.totalMinted,
    burned: stat.totalBurned,
    transfers: stat.transferVolume,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-economics">
          KUDOS Economics
        </h1>
        <p className="text-muted-foreground">
          Track the KUDOS token economy metrics and top holders
        </p>
        <p className="text-sm text-muted-foreground mt-2 p-3 bg-accent/50 rounded border border-border">
          KUDOS rewards are based on LocalHealth, a neutral network quality score. This incentive layer interprets those scores as contribution quality.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card data-testid="card-supply">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Supply</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-supply">
              {economics.totalSupply.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">KUDOS in circulation</p>
          </CardContent>
        </Card>

        <Card data-testid="card-burned">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Burned</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-burned">
              {economics.totalBurned.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Deflationary mechanism</p>
          </CardContent>
        </Card>

        <Card data-testid="card-pool">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pool Amount</CardTitle>
            <Droplet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pool">
              {economics.poolAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Available for claims today</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-chart">
        <CardHeader>
          <CardTitle>Daily Activity (Last 30 Days)</CardTitle>
          <CardDescription>
            Minting, burning, and transfer trends over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="minted"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  name="Minted"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="burned"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  name="Burned"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="transfers"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  name="Transfer Volume"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-holders">
        <CardHeader>
          <CardTitle>Top 10 Holders</CardTitle>
          <CardDescription>
            Addresses with the highest KUDOS balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Claimed</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {economics.topHolders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No holders yet
                  </TableCell>
                </TableRow>
              ) : (
                economics.topHolders.map((holder, index) => (
                  <TableRow key={holder.address} data-testid={`row-holder-${index}`}>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell className="font-mono text-sm" data-testid={`text-address-${index}`}>
                      {holder.address.slice(0, 8)}...{holder.address.slice(-6)}
                    </TableCell>
                    <TableCell className="text-right font-semibold" data-testid={`text-balance-${index}`}>
                      {holder.balance.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {holder.totalClaimed.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {holder.totalSent.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {holder.totalReceived.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card data-testid="card-metrics">
        <CardHeader>
          <CardTitle>Key Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Inflationary Pressure
              </h3>
              <p className="text-2xl font-bold">
                {economics.totalSupply > 0
                  ? ((economics.dailyStats.reduce((sum, stat) => sum + stat.totalMinted, 0) / economics.totalSupply) * 100).toFixed(2)
                  : "0.00"}%
              </p>
              <p className="text-xs text-muted-foreground">
                30-day minting as % of total supply
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Deflationary Pressure
              </h3>
              <p className="text-2xl font-bold">
                {economics.totalSupply > 0
                  ? ((economics.dailyStats.reduce((sum, stat) => sum + stat.totalBurned, 0) / economics.totalSupply) * 100).toFixed(2)
                  : "0.00"}%
              </p>
              <p className="text-xs text-muted-foreground">
                30-day burning as % of total supply
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-sm font-medium mb-2">Economic Design</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Daily claim formula: (LocalHealth Score² / 100)</li>
              <li>• Global daily cap: 1000 KUDOS across all users</li>
              <li>• Transfer fee: 1% (0.5% burned, 0.5% pooled)</li>
              <li>• Claim cooldown: 24 hours</li>
              <li>• Pure rewards layer: KUDOS never affects LocalHealth scores</li>
              <li className="pt-2 border-t italic">• One-way: LocalHealth determines rewards, rewards don't affect scores</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
