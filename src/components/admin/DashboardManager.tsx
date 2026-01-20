import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart3, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  PackageX,
  CheckCircle2,
  Clock,
  Loader2
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  averageOrderValue: number;
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

interface DailySales {
  date: string;
  revenue: number;
  orders: number;
}

interface OrderStatusData {
  name: string;
  value: number;
  color: string;
}

const STATUS_COLORS: Record<string, string> = {
  paid: "#22c55e",
  pending: "#f59e0b",
  pending_pix: "#3b82f6",
  cancelled: "#ef4444",
  shipped: "#8b5cf6",
  delivered: "#10b981",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  pending_pix: "Aguardando PIX",
  cancelled: "Cancelado",
  shipped: "Enviado",
  delivered: "Entregue",
};

const DashboardManager = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    averageOrderValue: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
  });
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<OrderStatusData[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*");

      if (ordersError) throw ordersError;

      // Fetch products
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("*");

      if (productsError) throw productsError;

      // Calculate stats
      const paidOrders = orders?.filter(o => o.status === "paid" || o.status === "shipped" || o.status === "delivered") || [];
      const pendingOrders = orders?.filter(o => o.status === "pending" || o.status === "pending_pix") || [];
      
      const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.paid_amount || o.total_amount || 0), 0);
      const averageOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

      const lowStockProducts = products?.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold) || [];
      const outOfStockProducts = products?.filter(p => p.stock_quantity === 0) || [];

      setStats({
        totalRevenue,
        totalOrders: orders?.length || 0,
        paidOrders: paidOrders.length,
        pendingOrders: pendingOrders.length,
        averageOrderValue,
        totalProducts: products?.length || 0,
        lowStockProducts: lowStockProducts.length,
        outOfStockProducts: outOfStockProducts.length,
      });

      // Calculate daily sales for last 7 days
      const last7Days: DailySales[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        
        const dayOrders = paidOrders.filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate >= dayStart && orderDate <= dayEnd;
        });

        last7Days.push({
          date: format(date, "dd/MM", { locale: ptBR }),
          revenue: dayOrders.reduce((sum, o) => sum + (o.paid_amount || o.total_amount || 0), 0) / 100,
          orders: dayOrders.length,
        });
      }
      setDailySales(last7Days);

      // Calculate orders by status
      const statusCount: Record<string, number> = {};
      orders?.forEach(o => {
        statusCount[o.status] = (statusCount[o.status] || 0) + 1;
      });

      const statusData: OrderStatusData[] = Object.entries(statusCount).map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        color: STATUS_COLORS[status] || "#94a3b8",
      }));
      setOrdersByStatus(statusData);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Dashboard
        </h2>
        <p className="text-muted-foreground mt-1">
          Visão geral de vendas e estoque
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              De {stats.paidOrders} pedidos pagos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {stats.paidOrders} pagos
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-yellow-500" />
                {stats.pendingOrders} pendentes
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground">
              Valor médio por pedido
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <div className="flex gap-2 text-xs text-muted-foreground">
              {stats.lowStockProducts > 0 && (
                <span className="flex items-center gap-1 text-orange-500">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.lowStockProducts} baixo
                </span>
              )}
              {stats.outOfStockProducts > 0 && (
                <span className="flex items-center gap-1 text-red-500">
                  <PackageX className="h-3 w-3" />
                  {stats.outOfStockProducts} esgotados
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas dos Últimos 7 Dias</CardTitle>
            <CardDescription>Receita diária em R$</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Receita"]}
                    labelFormatter={(label) => `Data: ${label}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Pedidos por Status</CardTitle>
            <CardDescription>Distribuição atual dos pedidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {ordersByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Alerts */}
      {(stats.lowStockProducts > 0 || stats.outOfStockProducts > 0) && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {stats.outOfStockProducts > 0 && (
                <div className="flex items-center gap-3 p-3 bg-red-100 rounded-lg">
                  <PackageX className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="font-semibold text-red-700">{stats.outOfStockProducts} produtos esgotados</p>
                    <p className="text-sm text-red-600">Requer reposição imediata</p>
                  </div>
                </div>
              )}
              {stats.lowStockProducts > 0 && (
                <div className="flex items-center gap-3 p-3 bg-orange-100 rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="font-semibold text-orange-700">{stats.lowStockProducts} produtos com estoque baixo</p>
                    <p className="text-sm text-orange-600">Considere repor em breve</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardManager;
