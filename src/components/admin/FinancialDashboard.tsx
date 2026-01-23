import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Package, DollarSign, Percent, TrendingUp, TrendingDown, Receipt, Calculator } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Product {
  id: string;
  name: string;
  price: number;
  cost_price: number;
  tax_percentage: number;
  profit_margin: number;
  stock_quantity: number;
}

interface Expense {
  id: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  date: string;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted))", "#8884d8", "#82ca9d"];

const FinancialDashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [productsRes, expensesRes, ordersRes] = await Promise.all([
        supabase.from("products").select("id, name, price, cost_price, tax_percentage, profit_margin, stock_quantity"),
        supabase.from("expenses").select("*").order("date", { ascending: false }),
        supabase.from("orders").select("id, total_amount, status, created_at").order("created_at", { ascending: false }),
      ]);

      setProducts(productsRes.data || []);
      setExpenses(expensesRes.data || []);
      setOrders(ordersRes.data || []);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Calculations
  const totalCostPrice = products.reduce((sum, p) => sum + (p.cost_price * p.stock_quantity), 0);
  const totalSellPrice = products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0);
  const totalTaxes = products.reduce((sum, p) => sum + (p.price * p.stock_quantity * p.tax_percentage / 100), 0);
  const potentialProfit = totalSellPrice - totalCostPrice - totalTaxes;

  const totalFixedExpenses = expenses.filter(e => e.type === "fixed").reduce((sum, e) => sum + e.amount, 0);
  const totalVariableExpenses = expenses.filter(e => e.type === "variable").reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = totalFixedExpenses + totalVariableExpenses;

  const completedOrders = orders.filter(o => o.status === "paid" || o.status === "shipped" || o.status === "delivered");
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total_amount, 0) / 100;
  
  const estimatedProfit = totalRevenue - totalExpenses - (totalRevenue * 0.1); // Assuming 10% avg tax

  // Charts data
  const expensesByCategory = expenses.reduce((acc, e) => {
    const existing = acc.find(item => item.name === e.category);
    if (existing) {
      existing.value += e.amount;
    } else {
      acc.push({ name: e.category, value: e.amount });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const productMargins = products.slice(0, 10).map(p => ({
    name: p.name.substring(0, 15),
    margin: ((p.price - p.cost_price - (p.price * p.tax_percentage / 100)) / p.price * 100) || 0,
    cost: p.cost_price,
    tax: p.price * p.tax_percentage / 100,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard Financeiro</h2>
        <p className="text-muted-foreground">Visão geral de produtos, custos, impostos e lucros</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="costs">Custos</TabsTrigger>
          <TabsTrigger value="taxes">Impostos</TabsTrigger>
          <TabsTrigger value="margins">Margens</TabsTrigger>
          <TabsTrigger value="profit">Lucro</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">{completedOrders.length} pedidos concluídos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
                <p className="text-xs text-muted-foreground">{expenses.length} lançamentos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Impostos Estimados</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalTaxes)}</div>
                <p className="text-xs text-muted-foreground">Sobre estoque atual</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Lucro Estimado</CardTitle>
                <Calculator className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${estimatedProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                  {formatCurrency(estimatedProfit)}
                </div>
                <p className="text-xs text-muted-foreground">Receita - Despesas - Impostos</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Despesas por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Margem por Produto (Top 10)</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productMargins}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Bar dataKey="margin" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Resumo de Produtos
              </CardTitle>
              <CardDescription>Valor do estoque baseado em custo e preço de venda</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Custo do Estoque</div>
                    <div className="text-2xl font-bold">{formatCurrency(totalCostPrice)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Valor de Venda</div>
                    <div className="text-2xl font-bold text-primary">{formatCurrency(totalSellPrice)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Lucro Potencial</div>
                    <div className="text-2xl font-bold text-primary">{formatCurrency(potentialProfit)}</div>
                  </CardContent>
                </Card>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Custo Un.</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Valor Estoque</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">{product.stock_quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.cost_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(product.price * product.stock_quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Análise de Custos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Custos Fixos</div>
                    <div className="text-2xl font-bold">{formatCurrency(totalFixedExpenses)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Custos Variáveis</div>
                    <div className="text-2xl font-bold">{formatCurrency(totalVariableExpenses)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Total</div>
                    <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
                  </CardContent>
                </Card>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.slice(0, 20).map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell>
                        <Badge variant={expense.type === "fixed" ? "secondary" : "outline"}>
                          {expense.type === "fixed" ? "Fixo" : "Variável"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Impostos por Produto
              </CardTitle>
              <CardDescription>Configuração de impostos e valores estimados</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">% Imposto</TableHead>
                    <TableHead className="text-right">Valor Imposto</TableHead>
                    <TableHead className="text-right">Imposto Estoque</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const taxValue = product.price * product.tax_percentage / 100;
                    const stockTax = taxValue * product.stock_quantity;
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                        <TableCell className="text-right">{product.tax_percentage}%</TableCell>
                        <TableCell className="text-right">{formatCurrency(taxValue)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(stockTax)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="margins">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Margens de Lucro
              </CardTitle>
              <CardDescription>Análise de margem por produto</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Imposto</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Lucro Un.</TableHead>
                    <TableHead className="text-right">Margem Real</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const taxValue = product.price * product.tax_percentage / 100;
                    const profit = product.price - product.cost_price - taxValue;
                    const margin = (profit / product.price) * 100;
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.cost_price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(taxValue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                        <TableCell className="text-right">
                          <span className={profit >= 0 ? "text-primary" : "text-destructive"}>
                            {formatCurrency(profit)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={margin >= 20 ? "default" : margin >= 10 ? "secondary" : "destructive"}>
                            {margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Lucro Estimado
              </CardTitle>
              <CardDescription>Cálculo de lucro baseado em vendas e despesas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Receita Bruta</div>
                    <div className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">(-) Despesas</div>
                    <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">(-) Impostos (est.)</div>
                    <div className="text-2xl font-bold">{formatCurrency(totalRevenue * 0.1)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary">
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">(=) Lucro Líquido</div>
                    <div className={`text-2xl font-bold ${estimatedProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                      {formatCurrency(estimatedProfit)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialDashboard;
