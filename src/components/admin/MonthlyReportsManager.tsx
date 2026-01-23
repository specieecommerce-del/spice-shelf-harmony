import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, 
  Download, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  ShoppingCart,
  Package,
  Percent,
  BarChart3,
  Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line } from "recharts";

interface Report {
  period: { month: number; year: number; monthName: string };
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageTicket: number;
    totalExpenses: number;
    fixedExpenses: number;
    variableExpenses: number;
    estimatedTaxes: number;
    netProfit: number;
    profitMargin: number;
  };
  comparison: {
    previousRevenue: number;
    revenueGrowth: number;
    previousOrders: number;
    ordersGrowth: number;
    trend: string;
  };
  charts: {
    salesByDay: Array<{ date: string; revenue: number; orders: number }>;
    salesByMethod: Array<{ method: string; count: number }>;
    expensesByCategory: Array<{ category: string; amount: number }>;
  };
  topProducts: Array<{ id: string; name: string; quantity: number; revenue: number }>;
  inventory: {
    totalProducts: number;
    stockValue: number;
    stockCost: number;
    potentialProfit: number;
  };
  generatedAt: string;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#8884d8", "#82ca9d", "#ffc658"];

const months = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const currentYear = new Date().getFullYear();
const years = [currentYear - 1, currentYear, currentYear + 1].map(y => ({ value: String(y), label: String(y) }));

const MonthlyReportsManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const generateReport = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-monthly-report", {
        body: { month: parseInt(selectedMonth), year: parseInt(selectedYear) },
      });

      if (error) throw error;
      setReport(data);
      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;

    const reportText = `
RELATÓRIO MENSAL - ${report.period.monthName.toUpperCase()} ${report.period.year}
Gerado em: ${new Date(report.generatedAt).toLocaleString("pt-BR")}

═══════════════════════════════════════════════════════════════

RESUMO FINANCEIRO
─────────────────────────────────────────────────────────────────
Receita Total:        ${formatCurrency(report.summary.totalRevenue)}
Total de Pedidos:     ${report.summary.totalOrders}
Ticket Médio:         ${formatCurrency(report.summary.averageTicket)}

Despesas Totais:      ${formatCurrency(report.summary.totalExpenses)}
  • Fixas:            ${formatCurrency(report.summary.fixedExpenses)}
  • Variáveis:        ${formatCurrency(report.summary.variableExpenses)}

Impostos Estimados:   ${formatCurrency(report.summary.estimatedTaxes)}
Lucro Líquido:        ${formatCurrency(report.summary.netProfit)}
Margem de Lucro:      ${report.summary.profitMargin.toFixed(1)}%

═══════════════════════════════════════════════════════════════

COMPARATIVO COM MÊS ANTERIOR
─────────────────────────────────────────────────────────────────
Receita Anterior:     ${formatCurrency(report.comparison.previousRevenue)}
Crescimento:          ${report.comparison.revenueGrowth >= 0 ? "+" : ""}${report.comparison.revenueGrowth.toFixed(1)}%
Pedidos Anterior:     ${report.comparison.previousOrders}
Var. Pedidos:         ${report.comparison.ordersGrowth >= 0 ? "+" : ""}${report.comparison.ordersGrowth.toFixed(1)}%

═══════════════════════════════════════════════════════════════

TOP 10 PRODUTOS
─────────────────────────────────────────────────────────────────
${report.topProducts.map((p, i) => `${i + 1}. ${p.name}\n   Qtd: ${p.quantity} | Receita: ${formatCurrency(p.revenue / 100)}`).join("\n")}

═══════════════════════════════════════════════════════════════

ESTOQUE
─────────────────────────────────────────────────────────────────
Total de Produtos:    ${report.inventory.totalProducts}
Valor do Estoque:     ${formatCurrency(report.inventory.stockValue)}
Custo do Estoque:     ${formatCurrency(report.inventory.stockCost)}
Lucro Potencial:      ${formatCurrency(report.inventory.potentialProfit)}
`;

    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${report.period.monthName}-${report.period.year}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório baixado!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Relatórios Mensais</h2>
          <p className="text-muted-foreground">Análise de vendas, crescimento e despesas</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={generateReport} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BarChart3 className="h-4 w-4 mr-2" />}
            Gerar Relatório
          </Button>
        </div>
      </div>

      {!report && !isLoading && (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nenhum relatório gerado</h3>
            <p className="text-muted-foreground mb-4">Selecione o mês e ano e clique em "Gerar Relatório"</p>
          </CardContent>
        </Card>
      )}

      {report && (
        <>
          {/* Header with download */}
          <div className="flex justify-between items-center">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <FileText className="h-4 w-4 mr-2" />
              {report.period.monthName} {report.period.year}
            </Badge>
            <Button variant="outline" onClick={downloadReport}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Relatório
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{formatCurrency(report.summary.totalRevenue)}</div>
                <div className="flex items-center text-xs mt-1">
                  {report.comparison.revenueGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  <span className={report.comparison.revenueGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                    {report.comparison.revenueGrowth >= 0 ? "+" : ""}{report.comparison.revenueGrowth.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground ml-1">vs mês anterior</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.totalOrders}</div>
                <p className="text-xs text-muted-foreground">Ticket médio: {formatCurrency(report.summary.averageTicket)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(report.summary.totalExpenses)}</div>
                <p className="text-xs text-muted-foreground">
                  F: {formatCurrency(report.summary.fixedExpenses)} | V: {formatCurrency(report.summary.variableExpenses)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
                <Percent className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${report.summary.netProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                  {formatCurrency(report.summary.netProfit)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Margem: {report.summary.profitMargin.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Vendas por Dia</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.charts.salesByDay}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.split("-")[2]} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métodos de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={report.charts.salesByMethod}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="method"
                    >
                      {report.charts.salesByMethod.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Top 10 Produtos Mais Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.topProducts.map((product, index) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell className="text-right">{product.quantity}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(product.revenue / 100)}</TableCell>
                    </TableRow>
                  ))}
                  {report.topProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhuma venda no período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Inventory Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Estoque</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-secondary/20 rounded-lg">
                  <div className="text-2xl font-bold">{report.inventory.totalProducts}</div>
                  <div className="text-sm text-muted-foreground">Produtos</div>
                </div>
                <div className="text-center p-4 bg-secondary/20 rounded-lg">
                  <div className="text-2xl font-bold">{formatCurrency(report.inventory.stockValue)}</div>
                  <div className="text-sm text-muted-foreground">Valor de Venda</div>
                </div>
                <div className="text-center p-4 bg-secondary/20 rounded-lg">
                  <div className="text-2xl font-bold">{formatCurrency(report.inventory.stockCost)}</div>
                  <div className="text-sm text-muted-foreground">Custo</div>
                </div>
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{formatCurrency(report.inventory.potentialProfit)}</div>
                  <div className="text-sm text-muted-foreground">Lucro Potencial</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default MonthlyReportsManager;
