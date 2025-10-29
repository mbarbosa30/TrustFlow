import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { HandHeart, TrendingUp, Wallet, DollarSign, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface Loan {
  id: number;
  borrowerAddress: string;
  communityId: number;
  principalUsdc: number;
  tenorMonths: number;
  aprBps: number;
  status: string;
  nextInstallmentIdx?: number;
  nextDueDate?: string;
}

interface LateInstallment {
  installmentId: number;
  loanId: number;
  idx: number;
  borrowerAddress: string;
  dueDate: string;
  totalDue: number;
  totalPaid: number;
  outstandingAmount: number;
  daysLate: number;
  status: string;
}

interface Pledge {
  id: number;
  loanId: number;
  donorAddress: string; // Note: stored as donorAddress in database
  monthlyUsdc: number;
  remainingMonths: number;
  totalPledged: number;
  totalApplied: number;
  status: string;
  createdAt: string;
}

interface Assist {
  id: number;
  loanId: number;
  installmentIdx: number;
  supporterAddress: string;
  amountUsdc: number;
  premiumRate: number;
  totalClaim: number;
  amountRepaid: number;
  status: string;
  createdAt: string;
}

export default function Support() {
  const { address } = useAccount();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("ibd");

  // Interest Buy-Down state
  const [selectedLoan, setSelectedLoan] = useState<number | null>(null);
  const [ibdAmount, setIbdAmount] = useState([50]);

  // Fetch available loans for IBD
  const { data: availableLoans, isLoading: loansLoading } = useQuery<Loan[]>({
    queryKey: ["/api/support/available-loans"],
    enabled: !!address,
  });

  // Fetch late installments for RA
  const { data: lateInstallments, isLoading: installmentsLoading } = useQuery<LateInstallment[]>({
    queryKey: ["/api/support/late-installments"],
    enabled: !!address,
  });

  // Fetch supporter portfolio
  const { data: portfolio, isLoading: portfolioLoading } = useQuery<{
    pledges: Pledge[];
    assists: Assist[];
  }>({
    queryKey: ["/api/support/portfolio", address],
    enabled: !!address,
  });

  // IBD pledge mutation
  const pledgeMutation = useMutation({
    mutationFn: async (data: { loanId: number; monthlyUsdc: number }) => {
      return await apiRequest("POST", "/api/subsidies/ibd", {
        loanId: data.loanId,
        donorAddress: address, // Note: API expects donorAddress
        monthlyUsdc: data.monthlyUsdc,
      });
    },
    onSuccess: () => {
      toast({
        title: "Reducción de Interés Creada",
        description: "Tu compromiso mensual ha sido activado para reducir la tasa de interés del prestatario.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/support/portfolio", address] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/available-loans"] });
      setSelectedLoan(null);
      setIbdAmount([50]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al Crear Compromiso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Repay-Assist mutation
  const assistMutation = useMutation({
    mutationFn: async (data: { installmentId: number; amountUsdc: number }) => {
      return await apiRequest("POST", "/api/subsidies/repay-assist", {
        installmentId: data.installmentId,
        supporterAddress: address,
        amountUsdc: data.amountUsdc,
      });
    },
    onSuccess: () => {
      toast({
        title: "Ayuda de Pago Activada",
        description: "Cubriste la cuota atrasada. El prestatario te reembolsará con 6% de premio.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/support/portfolio", address] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/late-installments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al Cubrir Cuota",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!address) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card data-testid="card-connect-wallet">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HandHeart className="h-6 w-6" />
              Apoyar a Prestatarios
            </CardTitle>
            <CardDescription>
              Conectá tu billetera para apoyar a prestatarios con Reducción de Interés y Ayuda de Pago
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Por favor conectá tu billetera para acceder a funciones de apoyo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <HandHeart className="h-8 w-8 text-primary" />
            Apoyar a Prestatarios
          </h1>
          <p className="text-muted-foreground mt-1">
            Ayudá a miembros de la comunidad a acceder a crédito accesible mediante subsidios
          </p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ibd" data-testid="tab-interest-buydown">
            <TrendingUp className="h-4 w-4 mr-2" />
            Reducción de Interés
          </TabsTrigger>
          <TabsTrigger value="ra" data-testid="tab-repay-assist">
            <HandHeart className="h-4 w-4 mr-2" />
            Ayuda de Pago
          </TabsTrigger>
          <TabsTrigger value="portfolio" data-testid="tab-portfolio">
            <Wallet className="h-4 w-4 mr-2" />
            Mi Portafolio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ibd" className="space-y-4">
          <Card data-testid="card-ibd-info">
            <CardHeader>
              <CardTitle>Reducción de Interés</CardTitle>
              <CardDescription>
                Comprometete mensualmente con ARS para reducir la tasa de interés del prestatario. Ganarás confianza en la comunidad y ayudarás a hacer el crédito más accesible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loansLoading ? (
                <p className="text-muted-foreground">Cargando préstamos disponibles...</p>
              ) : !availableLoans || availableLoans.length === 0 ? (
                <p className="text-muted-foreground">No hay préstamos activos disponibles para Reducción de Interés.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3">
                    {availableLoans.map((loan) => (
                      <Card
                        key={loan.id}
                        className={`cursor-pointer transition-colors ${
                          selectedLoan === loan.id ? "border-primary" : ""
                        }`}
                        onClick={() => setSelectedLoan(loan.id)}
                        data-testid={`card-loan-${loan.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-mono text-sm text-muted-foreground">
                                {loan.borrowerAddress.slice(0, 6)}...{loan.borrowerAddress.slice(-4)}
                              </p>
                              <p className="text-lg font-semibold">
                                ${(loan.principalUsdc / 1000).toFixed(0)}k ARS
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {loan.tenorMonths} meses @ {(loan.aprBps / 100).toFixed(1)}% TNA
                              </p>
                            </div>
                            <Badge variant="secondary">{loan.status === "ACTIVE" ? "ACTIVO" : loan.status}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {selectedLoan && (
                    <Card data-testid="card-ibd-pledge">
                      <CardHeader>
                        <CardTitle className="text-lg">Establecer Compromiso Mensual</CardTitle>
                        <CardDescription>
                          Elegí cuánto contribuir cada mes para reducir la tasa de interés del prestatario
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Monto Mensual</label>
                            <span className="text-lg font-semibold">${ibdAmount[0] * 10}k ARS</span>
                          </div>
                          <Slider
                            value={ibdAmount}
                            onValueChange={setIbdAmount}
                            min={10}
                            max={200}
                            step={10}
                            data-testid="slider-ibd-amount"
                          />
                          <p className="text-xs text-muted-foreground">
                            Comprometete entre $100k - $2M ARS por mes
                          </p>
                        </div>

                        <Button
                          onClick={() =>
                            pledgeMutation.mutate({
                              loanId: selectedLoan,
                              monthlyUsdc: ibdAmount[0],
                            })
                          }
                          disabled={pledgeMutation.isPending}
                          className="w-full"
                          data-testid="button-create-pledge"
                        >
                          {pledgeMutation.isPending ? "Creando Compromiso..." : "Activar Compromiso Mensual"}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ra" className="space-y-4">
          <Card data-testid="card-ra-info">
            <CardHeader>
              <CardTitle>Ayuda de Pago</CardTitle>
              <CardDescription>
                Cubrí cuotas atrasadas de prestatarios. Te reembolsarán con 6% de premio cuando reanuden los pagos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {installmentsLoading ? (
                <p className="text-muted-foreground">Cargando cuotas atrasadas...</p>
              ) : !lateInstallments || lateInstallments.length === 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <p>Todas las cuotas están al día. No hay oportunidades de Ayuda de Pago disponibles.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prestatario</TableHead>
                      <TableHead>Fecha de Vencimiento</TableHead>
                      <TableHead>Días de Atraso</TableHead>
                      <TableHead>Pendiente</TableHead>
                      <TableHead>Tu Retorno (6%)</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lateInstallments.map((installment) => (
                      <TableRow key={installment.installmentId} data-testid={`row-late-${installment.installmentId}`}>
                        <TableCell className="font-mono text-sm">
                          {installment.borrowerAddress.slice(0, 6)}...{installment.borrowerAddress.slice(-4)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-500" />
                            {format(new Date(installment.dueDate), "MMM d, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">{installment.daysLate} días</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${(installment.outstandingAmount / 1000).toFixed(1)}k ARS
                        </TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          ${((installment.outstandingAmount * 1.06) / 1000).toFixed(1)}k ARS
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() =>
                              assistMutation.mutate({
                                installmentId: installment.installmentId,
                                amountUsdc: installment.outstandingAmount,
                              })
                            }
                            disabled={assistMutation.isPending}
                            data-testid={`button-assist-${installment.installmentId}`}
                          >
                            {assistMutation.isPending ? "Cubriendo..." : "Cubrir Ahora"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-active-pledges">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Compromisos de Interés Activos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {portfolioLoading ? (
                  <p className="text-muted-foreground">Cargando portafolio...</p>
                ) : !portfolio?.pledges || portfolio.pledges.length === 0 ? (
                  <p className="text-muted-foreground">No hay compromisos de Reducción de Interés activos.</p>
                ) : (
                  <div className="space-y-3">
                    {portfolio.pledges.map((pledge) => (
                      <Card key={pledge.id} data-testid={`pledge-${pledge.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Préstamo #{pledge.loanId}</span>
                            <Badge variant="secondary">{pledge.status === "ACTIVE" ? "ACTIVO" : pledge.status}</Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Mensual:</span>
                              <span className="font-semibold">${(pledge.monthlyUsdc / 1000).toFixed(1)}k ARS</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Restante:</span>
                              <span className="font-semibold">{pledge.remainingMonths} meses</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Aplicado: ${(pledge.totalApplied / 1000).toFixed(1)}k</span>
                              <span>Total: ${(pledge.totalPledged / 1000).toFixed(1)}k</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-active-assists">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HandHeart className="h-5 w-5" />
                  Ayudas de Pago Activas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {portfolioLoading ? (
                  <p className="text-muted-foreground">Cargando portafolio...</p>
                ) : !portfolio?.assists || portfolio.assists.length === 0 ? (
                  <p className="text-muted-foreground">No hay reclamos de Ayuda de Pago activos.</p>
                ) : (
                  <div className="space-y-3">
                    {portfolio.assists.map((assist) => (
                      <Card key={assist.id} data-testid={`assist-${assist.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">
                              Préstamo #{assist.loanId} / Cuota #{assist.installmentIdx}
                            </span>
                            <Badge variant={assist.status === "OPEN" ? "default" : "secondary"}>
                              {assist.status === "OPEN" ? "ABIERTO" : assist.status === "REPAID" ? "REEMBOLSADO" : assist.status}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Cubierto:</span>
                              <span className="font-semibold">${(assist.amountUsdc / 1000).toFixed(1)}k ARS</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Reclamo Total (6%):</span>
                              <span className="font-semibold text-green-600">
                                ${(assist.totalClaim / 1000).toFixed(1)}k ARS
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Reembolsado: ${(assist.amountRepaid / 1000).toFixed(1)}k</span>
                              <span>
                                Restante: ${((assist.totalClaim - assist.amountRepaid) / 1000).toFixed(1)}k
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {portfolio && (portfolio.pledges.length > 0 || portfolio.assists.length > 0) && (
            <Card data-testid="card-portfolio-summary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Resumen del Portafolio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Total RI Aplicado</p>
                    <p className="text-2xl font-bold">
                      ${(portfolio.pledges
                        .reduce((sum, p) => sum + p.totalApplied, 0) / 1000).toFixed(1)}k ARS
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reclamos AP Pendientes</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${(portfolio.assists
                        .reduce((sum, a) => sum + (a.totalClaim - a.amountRepaid), 0) / 1000).toFixed(1)}k ARS
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ROI Total AP</p>
                    <p className="text-2xl font-bold">
                      {portfolio.assists.length > 0
                        ? (
                            (portfolio.assists.reduce(
                              (sum, a) => sum + (a.totalClaim - a.amountUsdc),
                              0
                            ) /
                              portfolio.assists.reduce((sum, a) => sum + a.amountUsdc, 0)) *
                            100
                          ).toFixed(1)
                        : "0.0"}
                      %
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
