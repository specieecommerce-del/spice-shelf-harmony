import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, CreditCard, Wallet, Receipt, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PaidOrder {
  id: string;
  order_nsu: string;
  customer_name: string | null;
  customer_email: string | null;
  total_amount: number;
  paid_amount: number | null;
  payment_method: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  pix_confirmed_at: string | null;
}

const ApprovedPaymentsManager = () => {
  const [paidOrders, setPaidOrders] = useState<PaidOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPaid: 0,
    pixCount: 0,
    cardCount: 0,
    boletoCount: 0,
    totalRevenue: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "paid")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const pixCount = data?.filter(o => o.payment_method === "pix").length || 0;
      const cardCount = data?.filter(o => o.payment_method?.includes("card")).length || 0;
      const boletoCount = data?.filter(o => o.payment_method === "boleto").length || 0;
      const totalRevenue = data?.reduce((sum, o) => sum + (o.paid_amount || o.total_amount), 0) || 0;

      setPaidOrders(data || []);
      setStats({
        totalPaid: data?.length || 0,
        pixCount,
        cardCount,
        boletoCount,
        totalRevenue,
      });
    } catch (error) {
      console.error("Erro ao buscar pagamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("paid-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: "status=eq.paid",
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  const getPaymentIcon = (method: string | null) => {
    switch (method) {
      case "pix":
        return <Wallet className="h-4 w-4 text-green-600" />;
      case "credit_card":
      case "debit_card":
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case "boleto":
        return <Receipt className="h-4 w-4 text-amber-600" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPaymentLabel = (method: string | null) => {
    switch (method) {
      case "pix":
        return "PIX";
      case "credit_card":
        return "Cartão de Crédito";
      case "debit_card":
        return "Cartão de Débito";
      case "boleto":
        return "Boleto";
      default:
        return method || "Não informado";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pagamentos Aprovados</h2>
          <p className="text-muted-foreground">
            Todos os pagamentos confirmados automaticamente
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.totalPaid}</p>
              <p className="text-sm text-muted-foreground">Total Aprovados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.pixCount}</p>
              <p className="text-sm text-muted-foreground">Via PIX</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.cardCount}</p>
              <p className="text-sm text-muted-foreground">Via Cartão</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.boletoCount}</p>
              <p className="text-sm text-muted-foreground">Via Boleto</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-sm text-muted-foreground">Receita Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Pagamentos Aprovados</CardTitle>
        </CardHeader>
        <CardContent>
          {paidOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum pagamento aprovado ainda
            </p>
          ) : (
            <div className="space-y-3">
              {paidOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-500/10 rounded-full">
                      {getPaymentIcon(order.payment_method)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">#{order.order_nsu}</span>
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                          PAGO
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.customer_name || "Cliente não informado"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getPaymentLabel(order.payment_method)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-semibold text-lg text-green-700">
                      {formatCurrency(order.paid_amount || order.total_amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(order.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApprovedPaymentsManager;
