import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  Bell,
  Truck
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
import { toast } from "sonner";

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  pendingPixOrders: number;
  processingOrders: number;
  shippedOrders: number;
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

interface RecentActivity {
  id: string;
  type: "new_order" | "payment" | "shipped" | "stock_alert";
  message: string;
  timestamp: Date;
  orderNsu?: string;
}

const STATUS_COLORS: Record<string, string> = {
  paid: "#22c55e",
  pending: "#f59e0b",
  pending_pix: "#3b82f6",
  processing: "#8b5cf6",
  cancelled: "#ef4444",
  shipped: "#6366f1",
  delivered: "#10b981",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  pending_pix: "Aguardando PIX",
  processing: "Em Preparação",
  cancelled: "Cancelado",
  shipped: "Enviado",
  delivered: "Entregue",
};

const DashboardManager = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    pendingPixOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    averageOrderValue: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
  });
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<OrderStatusData[]>([]);

  const addActivity = useCallback((activity: Omit<RecentActivity, "id" | "timestamp">) => {
    const newActivity: RecentActivity = {
      ...activity,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setRecentActivities(prev => [newActivity, ...prev].slice(0, 10));
  }, []);

  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      // Fetch orders using admin edge function (bypasses RLS)
      const { data: ordersResponse, error: ordersError } = await supabase.functions.invoke("admin-orders", {
        body: {
          action: "list_orders",
          status: "all",
          page: 1,
          limit: 1000, // Get all orders for stats
        },
      });

      if (ordersError) throw ordersError;
      if (ordersResponse?.error) throw new Error(ordersResponse.error);

      const orders = ordersResponse?.orders || [];

      // Fetch products
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("*");

      if (productsError) throw productsError;

      // Calculate stats
      const paidOrders = orders?.filter(o => o.status === "paid" || o.status === "shipped" || o.status === "delivered") || [];
      const pendingOrders = orders?.filter(o => o.status === "pending") || [];
      const pendingPixOrders = orders?.filter(o => o.status === "pending_pix") || [];
      const processingOrders = orders?.filter(o => o.status === "processing") || [];
      const shippedOrders = orders?.filter(o => o.status === "shipped") || [];
      
      const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.paid_amount || o.total_amount || 0), 0);
      const averageOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

      const lowStockProducts = products?.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold) || [];
      const outOfStockProducts = products?.filter(p => p.stock_quantity === 0) || [];

      setStats({
        totalRevenue,
        totalOrders: orders?.length || 0,
        paidOrders: paidOrders.length,
        pendingOrders: pendingOrders.length,
        pendingPixOrders: pendingPixOrders.length,
        processingOrders: processingOrders.length,
        shippedOrders: shippedOrders.length,
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
      setLastUpdate(new Date());

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Setup realtime subscription
  useEffect(() => {
    console.log("Setting up realtime subscriptions...");

    // Subscribe to orders changes
    const ordersChannel = supabase
      .channel('dashboard-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log("Order change detected:", payload);
          
          const order = payload.new as { 
            order_nsu?: string; 
            status?: string; 
            customer_name?: string;
            total_amount?: number;
          };
          const oldOrder = payload.old as { status?: string };

          if (payload.eventType === 'INSERT') {
            addActivity({
              type: "new_order",
              message: `Novo pedido ${order.order_nsu} de ${order.customer_name || 'Cliente'}`,
              orderNsu: order.order_nsu,
            });
            toast.info(`🛒 Novo pedido: ${order.order_nsu}`, {
              description: order.customer_name || 'Novo cliente',
            });
          } else if (payload.eventType === 'UPDATE') {
            // Status changed to paid
            if (order.status === 'paid' && oldOrder.status !== 'paid') {
              addActivity({
                type: "payment",
                message: `Pagamento confirmado para ${order.order_nsu}`,
                orderNsu: order.order_nsu,
              });
              toast.success(`💰 Pagamento confirmado: ${order.order_nsu}`);
            }
            // Status changed to shipped
            if (order.status === 'shipped' && oldOrder.status !== 'shipped') {
              addActivity({
                type: "shipped",
                message: `Pedido ${order.order_nsu} foi enviado`,
                orderNsu: order.order_nsu,
              });
              toast.success(`📦 Pedido enviado: ${order.order_nsu}`);
            }
          }

          // Refresh stats silently
          fetchDashboardData(true);
        }
      )
      .subscribe((status) => {
        console.log("Orders subscription status:", status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Subscribe to products changes (stock)
    const productsChannel = supabase
      .channel('dashboard-products')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          console.log("Product change detected:", payload);
          
          const product = payload.new as { 
            name?: string; 
            stock_quantity?: number;
            low_stock_threshold?: number;
          };
          const oldProduct = payload.old as { stock_quantity?: number };

          // Stock alert
          if (product.stock_quantity !== undefined && oldProduct.stock_quantity !== undefined) {
            if (product.stock_quantity === 0 && oldProduct.stock_quantity > 0) {
              addActivity({
                type: "stock_alert",
                message: `${product.name} está esgotado!`,
              });
              toast.warning(`⚠️ Estoque esgotado: ${product.name}`);
            } else if (
              product.stock_quantity <= (product.low_stock_threshold || 5) && 
              oldProduct.stock_quantity > (product.low_stock_threshold || 5)
            ) {
              addActivity({
                type: "stock_alert",
                message: `${product.name} com estoque baixo (${product.stock_quantity} un.)`,
              });
              toast.warning(`📉 Estoque baixo: ${product.name}`);
            }
          }

          // Refresh stats silently
          fetchDashboardData(true);
        }
      )
      .subscribe();

    return () => {
      console.log("Cleaning up realtime subscriptions...");
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(productsChannel);
    };
  }, [fetchDashboardData, addActivity]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  const getActivityIcon = (type: RecentActivity["type"]) => {
    switch (type) {
      case "new_order":
        return <ShoppingCart className="h-4 w-4 text-blue-500" />;
      case "payment":
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case "shipped":
        return <Truck className="h-4 w-4 text-purple-500" />;
      case "stock_alert":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "agora";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m atrás`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    return format(date, "dd/MM HH:mm");
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
      {/* Header with realtime status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Dashboard
            <Badge 
              variant={isConnected ? "default" : "secondary"}
              className={`ml-2 ${isConnected ? "bg-green-500 hover:bg-green-600" : ""}`}
            >
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Ao vivo
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </>
              )}
            </Badge>
          </h2>
          <p className="text-muted-foreground mt-1">
            Última atualização: {format(lastUpdate, "HH:mm:ss")}
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchDashboardData()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Realtime Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
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

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {stats.paidOrders} pagos
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-yellow-500" />
                {stats.pendingOrders + stats.pendingPixOrders} pendentes
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
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

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
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

      {/* Quick Status Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-700">{stats.pendingPixOrders}</p>
              <p className="text-xs text-orange-600">Aguardando PIX</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{stats.paidOrders - stats.processingOrders - stats.shippedOrders}</p>
              <p className="text-xs text-blue-600">Pagos (a separar)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-700">{stats.processingOrders}</p>
              <p className="text-xs text-purple-600">Em Preparação</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Truck className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-700">{stats.shippedOrders}</p>
              <p className="text-xs text-indigo-600">Em Trânsito</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sales Chart */}
        <Card className="lg:col-span-2">
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

        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Atividade Recente
            </CardTitle>
            <CardDescription>Atualizações em tempo real</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[280px] overflow-y-auto">
              {recentActivities.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aguardando atividades...</p>
                  <p className="text-xs">Novas atualizações aparecerão aqui</p>
                </div>
              ) : (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders by Status Chart */}
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
