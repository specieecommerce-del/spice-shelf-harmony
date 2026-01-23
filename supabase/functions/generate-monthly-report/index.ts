import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { month, year } = await req.json();
    
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();
    
    const startDate = new Date(targetYear, targetMonth - 1, 1).toISOString();
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59).toISOString();

    // Previous month for comparison
    const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
    const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
    const prevStartDate = new Date(prevYear, prevMonth - 1, 1).toISOString();
    const prevEndDate = new Date(prevYear, prevMonth, 0, 23, 59, 59).toISOString();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch current month data
    const [ordersRes, expensesRes, productsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, total_amount, status, created_at, payment_method, items")
        .gte("created_at", startDate)
        .lte("created_at", endDate),
      supabase
        .from("expenses")
        .select("*")
        .gte("date", startDate.split("T")[0])
        .lte("date", endDate.split("T")[0]),
      supabase
        .from("products")
        .select("id, name, price, cost_price, stock_quantity, category"),
    ]);

    // Fetch previous month orders for comparison
    const { data: prevOrders } = await supabase
      .from("orders")
      .select("id, total_amount, status")
      .gte("created_at", prevStartDate)
      .lte("created_at", prevEndDate);

    const orders = ordersRes.data || [];
    const expenses = expensesRes.data || [];
    const products = productsRes.data || [];
    const previousOrders = prevOrders || [];

    // Calculate metrics
    const paidStatuses = ["paid", "shipped", "delivered", "processing"];
    const completedOrders = orders.filter(o => paidStatuses.includes(o.status));
    const prevCompletedOrders = previousOrders.filter(o => paidStatuses.includes(o.status));

    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0) / 100;
    const prevRevenue = prevCompletedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0) / 100;
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const fixedExpenses = expenses.filter(e => e.type === "fixed").reduce((sum, e) => sum + e.amount, 0);
    const variableExpenses = expenses.filter(e => e.type === "variable").reduce((sum, e) => sum + e.amount, 0);

    const estimatedTaxes = totalRevenue * 0.1;
    const netProfit = totalRevenue - totalExpenses - estimatedTaxes;

    // Sales by day
    const salesByDay: Record<string, { revenue: number; orders: number }> = {};
    completedOrders.forEach(order => {
      const day = order.created_at.split("T")[0];
      if (!salesByDay[day]) {
        salesByDay[day] = { revenue: 0, orders: 0 };
      }
      salesByDay[day].revenue += (order.total_amount || 0) / 100;
      salesByDay[day].orders += 1;
    });

    // Sales by payment method
    const salesByMethod: Record<string, number> = {};
    completedOrders.forEach(order => {
      const method = order.payment_method || "unknown";
      salesByMethod[method] = (salesByMethod[method] || 0) + 1;
    });

    // Top selling products (from order items)
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    completedOrders.forEach(order => {
      const items = order.items as Array<{ productId: string; name: string; quantity: number; price: number }>;
      if (Array.isArray(items)) {
        items.forEach(item => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
          }
          productSales[item.productId].quantity += item.quantity;
          productSales[item.productId].revenue += item.price * item.quantity;
        });
      }
    });

    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([id, data]) => ({ id, ...data }));

    // Expenses by category
    const expensesByCategory: Record<string, number> = {};
    expenses.forEach(e => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
    });

    // Stock value
    const stockValue = products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0);
    const stockCost = products.reduce((sum, p) => sum + ((p.cost_price || 0) * p.stock_quantity), 0);

    // Build report
    const report = {
      period: {
        month: targetMonth,
        year: targetYear,
        monthName: new Date(targetYear, targetMonth - 1).toLocaleString("pt-BR", { month: "long" }),
      },
      summary: {
        totalRevenue,
        totalOrders: completedOrders.length,
        averageTicket: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
        totalExpenses,
        fixedExpenses,
        variableExpenses,
        estimatedTaxes,
        netProfit,
        profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      },
      comparison: {
        previousRevenue: prevRevenue,
        revenueGrowth,
        previousOrders: prevCompletedOrders.length,
        ordersGrowth: prevCompletedOrders.length > 0 
          ? ((completedOrders.length - prevCompletedOrders.length) / prevCompletedOrders.length) * 100 
          : 0,
        trend: revenueGrowth >= 0 ? "growth" : "decline",
      },
      charts: {
        salesByDay: Object.entries(salesByDay).map(([date, data]) => ({
          date,
          ...data,
        })).sort((a, b) => a.date.localeCompare(b.date)),
        salesByMethod: Object.entries(salesByMethod).map(([method, count]) => ({
          method: method === "pix" ? "PIX" : method === "credit_card" ? "Cartão" : method === "boleto" ? "Boleto" : method,
          count,
        })),
        expensesByCategory: Object.entries(expensesByCategory).map(([category, amount]) => ({
          category,
          amount,
        })),
      },
      topProducts,
      inventory: {
        totalProducts: products.length,
        stockValue,
        stockCost,
        potentialProfit: stockValue - stockCost,
      },
      generatedAt: new Date().toISOString(),
    };

    console.log(`Report generated for ${report.period.monthName}/${targetYear}`);

    return new Response(
      JSON.stringify(report),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating report:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao gerar relatório" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
