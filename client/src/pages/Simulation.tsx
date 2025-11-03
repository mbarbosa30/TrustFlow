import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SimulationMetrics {
  algorithmName: string;
  scenario: string;
  runtimeMs: number;
  totalNodes: number;
  totalEdges: number;
  honestAccepted: number;
  sybilAccepted: number;
  honestAcceptanceRate: number;
  sybilAcceptanceRate: number;
  avgHonestScore: number;
  avgSybilScore: number;
  medianHonestScore: number;
  medianSybilScore: number;
  giniCoefficient: number;
  attackCost: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
}

interface SimulationResult {
  metrics: SimulationMetrics[];
  config: {
    scenario: string;
    numHonestUsers: number;
    numSybilUsers: number;
    numSeeds: number;
    edgeDensity: number;
  };
}

export default function Simulation() {
  const [numHonestUsers, setNumHonestUsers] = useState(50);
  const [numSybilUsers, setNumSybilUsers] = useState(20);
  const [numSeeds, setNumSeeds] = useState(3);
  const [edgeDensity, setEdgeDensity] = useState(0.2);
  const [scenario, setScenario] = useState("sybil_linear_chain");

  const runMutation = useMutation({
    mutationFn: async (): Promise<SimulationResult> => {
      const config = {
        numHonestUsers,
        numSybilUsers,
        numSeeds,
        edgeDensity,
        scenario,
      };

      const algorithms = [
        {
          name: "Advogato (Supersink + Node Cap)",
          useNodeCapacities: true,
          useSupersink: true,
          maxDistance: 3,
          nodeCapacity: 1.0,
        },
        {
          name: "MaxFlow Current (Per-Node)",
          useNodeCapacities: false,
          useSupersink: false,
          maxDistance: 3,
        },
      ];

      const response = await apiRequest("POST", "/api/simulation/run", { config, algorithms });

      return await response.json();
    },
  });

  const benchmarkMutation = useMutation({
    mutationFn: async (): Promise<{ results: SimulationResult[] }> => {
      const response = await apiRequest("POST", "/api/simulation/benchmark", {});

      return await response.json();
    },
  });

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatMs = (value: number) => `${value.toFixed(0)}ms`;
  const formatScore = (value: number) => value.toFixed(1);

  const renderComparison = (val1: number, val2: number, higherIsBetter: boolean) => {
    const diff = val1 - val2;
    const isDifferent = Math.abs(diff) > 0.01;
    
    if (!isDifferent) return <Minus className="w-4 h-4 text-muted-foreground" data-testid="icon-neutral" />;
    
    const isBetter = higherIsBetter ? diff > 0 : diff < 0;
    
    if (isBetter) {
      return <TrendingUp className="w-4 h-4 text-green-600" data-testid="icon-better" />;
    }
    return <TrendingDown className="w-4 h-4 text-red-600" data-testid="icon-worse" />;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-simulation">Algorithm Simulation</h1>
        <p className="text-muted-foreground" data-testid="text-description">
          Compare MaxFlow algorithms against Sybil attack scenarios. Test Advogato-style supersink vs. per-node scoring.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card data-testid="card-config">
          <CardHeader>
            <CardTitle data-testid="heading-config">Configuration</CardTitle>
            <CardDescription data-testid="text-config-description">
              Customize network parameters and attack scenario
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scenario" data-testid="label-scenario">Attack Scenario</Label>
              <Select value={scenario} onValueChange={setScenario}>
                <SelectTrigger id="scenario" data-testid="select-scenario">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="honest_network" data-testid="option-honest">Honest Network (No Attack)</SelectItem>
                  <SelectItem value="sybil_linear_chain" data-testid="option-linear">Sybil Linear Chain</SelectItem>
                  <SelectItem value="sybil_clique" data-testid="option-clique">Sybil Clique</SelectItem>
                  <SelectItem value="whale_attack" data-testid="option-whale">Whale Attack</SelectItem>
                  <SelectItem value="sparse_network" data-testid="option-sparse">Sparse Network</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="honest" data-testid="label-honest">Honest Users</Label>
                <Input
                  id="honest"
                  type="number"
                  value={numHonestUsers}
                  onChange={(e) => setNumHonestUsers(Number(e.target.value))}
                  min={10}
                  max={200}
                  data-testid="input-honest"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sybil" data-testid="label-sybil">Sybil Users</Label>
                <Input
                  id="sybil"
                  type="number"
                  value={numSybilUsers}
                  onChange={(e) => setNumSybilUsers(Number(e.target.value))}
                  min={0}
                  max={200}
                  data-testid="input-sybil"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seeds" data-testid="label-seeds">Seeds</Label>
                <Input
                  id="seeds"
                  type="number"
                  value={numSeeds}
                  onChange={(e) => setNumSeeds(Number(e.target.value))}
                  min={1}
                  max={10}
                  data-testid="input-seeds"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="density" data-testid="label-density">Edge Density</Label>
                <Input
                  id="density"
                  type="number"
                  step="0.1"
                  value={edgeDensity}
                  onChange={(e) => setEdgeDensity(Number(e.target.value))}
                  min={0.05}
                  max={1.0}
                  data-testid="input-density"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => runMutation.mutate()}
                disabled={runMutation.isPending}
                className="flex-1"
                data-testid="button-run"
              >
                {runMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Simulation
                  </>
                )}
              </Button>

              <Button
                onClick={() => benchmarkMutation.mutate()}
                disabled={benchmarkMutation.isPending}
                variant="outline"
                data-testid="button-benchmark"
              >
                {benchmarkMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Benchmarking...
                  </>
                ) : (
                  "Run Benchmark"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-about">
          <CardHeader>
            <CardTitle data-testid="heading-about">About the Simulation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold mb-1" data-testid="heading-algorithms">Algorithms Compared</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li data-testid="text-advogato"><strong>Advogato (Supersink):</strong> Single max-flow to shared sink, node capacities via splitting</li>
                <li data-testid="text-maxflow"><strong>MaxFlow Current:</strong> Per-node scoring, distance-based capacity decay</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-1" data-testid="heading-scenarios">Attack Scenarios</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li data-testid="text-linear"><strong>Linear Chain:</strong> Sybils form chain from honest entry point</li>
                <li data-testid="text-clique"><strong>Clique:</strong> Dense Sybil mesh with multiple entry points</li>
                <li data-testid="text-whale"><strong>Whale:</strong> Single high-capacity funder of Sybil network</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-1" data-testid="heading-metrics">Key Metrics</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li data-testid="text-fpr"><strong>False Positive Rate:</strong> Sybils accepted / Total Sybils</li>
                <li data-testid="text-fnr"><strong>False Negative Rate:</strong> Honest rejected / Total Honest</li>
                <li data-testid="text-cost"><strong>Attack Cost:</strong> Edges from honest to Sybil nodes</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {runMutation.data && (
        <Card data-testid="card-results">
          <CardHeader>
            <CardTitle data-testid="heading-results">Results</CardTitle>
            <CardDescription data-testid="text-results-description">
              Scenario: {runMutation.data.config.scenario} | Nodes: {runMutation.data.config.numHonestUsers + runMutation.data.config.numSybilUsers} | Seeds: {runMutation.data.config.numSeeds}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table data-testid="table-comparison">
              <TableHeader>
                <TableRow>
                  <TableHead data-testid="header-metric">Metric</TableHead>
                  <TableHead data-testid="header-advogato">Advogato</TableHead>
                  <TableHead data-testid="header-maxflow">MaxFlow</TableHead>
                  <TableHead data-testid="header-winner">Winner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runMutation.data.metrics.length === 2 && (
                  <>
                    <TableRow>
                      <TableCell className="font-medium" data-testid="metric-runtime">Runtime</TableCell>
                      <TableCell data-testid="value-advogato-runtime">{formatMs(runMutation.data.metrics[0].runtimeMs)}</TableCell>
                      <TableCell data-testid="value-maxflow-runtime">{formatMs(runMutation.data.metrics[1].runtimeMs)}</TableCell>
                      <TableCell data-testid="comparison-runtime">
                        {renderComparison(runMutation.data.metrics[1].runtimeMs, runMutation.data.metrics[0].runtimeMs, false)}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium" data-testid="metric-honest-rate">Honest Acceptance Rate</TableCell>
                      <TableCell data-testid="value-advogato-honest">{formatPercent(runMutation.data.metrics[0].honestAcceptanceRate)}</TableCell>
                      <TableCell data-testid="value-maxflow-honest">{formatPercent(runMutation.data.metrics[1].honestAcceptanceRate)}</TableCell>
                      <TableCell data-testid="comparison-honest">
                        {renderComparison(runMutation.data.metrics[0].honestAcceptanceRate, runMutation.data.metrics[1].honestAcceptanceRate, true)}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium" data-testid="metric-sybil-rate">Sybil Acceptance Rate (Lower is Better)</TableCell>
                      <TableCell data-testid="value-advogato-sybil">{formatPercent(runMutation.data.metrics[0].sybilAcceptanceRate)}</TableCell>
                      <TableCell data-testid="value-maxflow-sybil">{formatPercent(runMutation.data.metrics[1].sybilAcceptanceRate)}</TableCell>
                      <TableCell data-testid="comparison-sybil">
                        {renderComparison(runMutation.data.metrics[0].sybilAcceptanceRate, runMutation.data.metrics[1].sybilAcceptanceRate, false)}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium" data-testid="metric-false-positive">False Positive Rate</TableCell>
                      <TableCell data-testid="value-advogato-fpr">{formatPercent(runMutation.data.metrics[0].falsePositiveRate)}</TableCell>
                      <TableCell data-testid="value-maxflow-fpr">{formatPercent(runMutation.data.metrics[1].falsePositiveRate)}</TableCell>
                      <TableCell data-testid="comparison-fpr">
                        {renderComparison(runMutation.data.metrics[0].falsePositiveRate, runMutation.data.metrics[1].falsePositiveRate, false)}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium" data-testid="metric-false-negative">False Negative Rate</TableCell>
                      <TableCell data-testid="value-advogato-fnr">{formatPercent(runMutation.data.metrics[0].falseNegativeRate)}</TableCell>
                      <TableCell data-testid="value-maxflow-fnr">{formatPercent(runMutation.data.metrics[1].falseNegativeRate)}</TableCell>
                      <TableCell data-testid="comparison-fnr">
                        {renderComparison(runMutation.data.metrics[0].falseNegativeRate, runMutation.data.metrics[1].falseNegativeRate, false)}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium" data-testid="metric-avg-honest">Avg Honest Score</TableCell>
                      <TableCell data-testid="value-advogato-avg-honest">{formatScore(runMutation.data.metrics[0].avgHonestScore)}</TableCell>
                      <TableCell data-testid="value-maxflow-avg-honest">{formatScore(runMutation.data.metrics[1].avgHonestScore)}</TableCell>
                      <TableCell data-testid="comparison-avg-honest">
                        {renderComparison(runMutation.data.metrics[0].avgHonestScore, runMutation.data.metrics[1].avgHonestScore, true)}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium" data-testid="metric-avg-sybil">Avg Sybil Score (Lower is Better)</TableCell>
                      <TableCell data-testid="value-advogato-avg-sybil">{formatScore(runMutation.data.metrics[0].avgSybilScore)}</TableCell>
                      <TableCell data-testid="value-maxflow-avg-sybil">{formatScore(runMutation.data.metrics[1].avgSybilScore)}</TableCell>
                      <TableCell data-testid="comparison-avg-sybil">
                        {renderComparison(runMutation.data.metrics[0].avgSybilScore, runMutation.data.metrics[1].avgSybilScore, false)}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium" data-testid="metric-gini">Gini Coefficient (Lower = More Equal)</TableCell>
                      <TableCell data-testid="value-advogato-gini">{formatScore(runMutation.data.metrics[0].giniCoefficient)}</TableCell>
                      <TableCell data-testid="value-maxflow-gini">{formatScore(runMutation.data.metrics[1].giniCoefficient)}</TableCell>
                      <TableCell data-testid="comparison-gini">
                        {renderComparison(runMutation.data.metrics[0].giniCoefficient, runMutation.data.metrics[1].giniCoefficient, false)}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium" data-testid="metric-attack-cost">Attack Cost (Edges)</TableCell>
                      <TableCell data-testid="value-advogato-cost">{runMutation.data.metrics[0].attackCost}</TableCell>
                      <TableCell data-testid="value-maxflow-cost">{runMutation.data.metrics[1].attackCost}</TableCell>
                      <TableCell data-testid="comparison-cost">
                        {renderComparison(runMutation.data.metrics[0].attackCost, runMutation.data.metrics[1].attackCost, true)}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {benchmarkMutation.data && (
        <Card data-testid="card-benchmark">
          <CardHeader>
            <CardTitle data-testid="heading-benchmark">Benchmark Results</CardTitle>
            <CardDescription data-testid="text-benchmark-description">
              Comparison across {benchmarkMutation.data.results.length} scenarios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {benchmarkMutation.data.results.map((result, idx) => (
              <div key={idx} className="space-y-2" data-testid={`benchmark-${idx}`}>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" data-testid={`badge-scenario-${idx}`}>{result.config.scenario}</Badge>
                  <span className="text-sm text-muted-foreground" data-testid={`text-stats-${idx}`}>
                    {result.config.numHonestUsers}H / {result.config.numSybilUsers}S / {result.config.numSeeds} seeds
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {result.metrics.map((m, midx) => (
                    <div key={midx} className="space-y-1" data-testid={`algo-${idx}-${midx}`}>
                      <div className="font-medium" data-testid={`algo-name-${idx}-${midx}`}>{m.algorithmName}</div>
                      <div className="text-muted-foreground space-y-0.5">
                        <div data-testid={`metric-runtime-${idx}-${midx}`}>Runtime: {formatMs(m.runtimeMs)}</div>
                        <div data-testid={`metric-fpr-${idx}-${midx}`}>FPR: {formatPercent(m.falsePositiveRate)}</div>
                        <div data-testid={`metric-fnr-${idx}-${midx}`}>FNR: {formatPercent(m.falseNegativeRate)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
