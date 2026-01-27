import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Clock, Zap, Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrderLog {
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
}

const AutoVerificationManager = () => {
  const [recentOrders, setRecentOrders] = useState<OrderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAutoConfirmed: 0,
    todayConfirmed: 0,
    pendingCount: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar pedidos pagos recentemente (confirmados automaticamente)
      const { data: paidOrders, error: paidError } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "paid")
        .order("updated_at", { ascending: false })
        .limit(20);

      if (paidError) throw paidError;

      // Buscar pedidos pendentes
      const { data: pendingOrders, error: pendingError } = await supabase
        .from("orders")
        .select("id")
        .in("status", ["pending", "pending_pix", "pending_boleto"]);

      if (pendingError) throw pendingError;

      // Calcular estatísticas
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayConfirmed = paidOrders?.filter((order) => {
        const updatedAt = new Date(order.updated_at);
        return updatedAt >= today;
      }).length || 0;

      setRecentOrders(paidOrders || []);
      setStats({
        totalAutoConfirmed: paidOrders?.length || 0,
        todayConfirmed,
        pendingCount: pendingOrders?.length || 0,
      });
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Configurar realtime para atualizações automáticas
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          if (payload.new.status === "paid") {
            fetchData();
          }
        }
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

  const getPaymentMethodLabel = (method: string | null) => {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Verificação Automática</h2>
          <p className="text-muted-foreground">
            Acompanhe as confirmações de pagamento em tempo real
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Status do Sistema */}
      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-full">
              <Zap className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Sistema Automático Ativo</h3>
              <p className="text-sm text-muted-foreground">
                Os pagamentos são confirmados automaticamente em tempo real via webhook
              </p>
            </div>
            <Badge className="ml-auto bg-green-500 text-white">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Online
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Confirmados Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats.todayConfirmed}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Confirmados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats.totalAutoConfirmed}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aguardando Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{stats.pendingCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Como Funciona */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como Funciona</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center justify-center py-4">
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-lg">
              <span className="font-medium">1. Cliente paga</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-lg">
              <span className="font-medium">2. Gateway confirma</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-lg">
              <span className="font-medium">3. Webhook recebe</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-lg border border-green-500/30">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-700">4. Pedido PAGO</span>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Todo o processo acontece em segundos, sem necessidade de ação manual
          </p>
        </CardContent>
      </Card>

      {/* Lista de Confirmações Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Confirmações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma confirmação automática ainda
            </p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Pedido #{order.order_nsu}</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        PAGO
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Cliente: {order.customer_name || "Não informado"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pagamento: {getPaymentMethodLabel(order.payment_method)}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-semibold text-lg">
                      {formatCurrency(order.paid_amount || order.total_amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Confirmado em:{" "}
                      {format(new Date(order.updated_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                    <p className="text-xs text-green-600 flex items-center justify-end gap-1">
                      <Zap className="h-3 w-3" />
                      Sistema automático
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Segurança */}
      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Shield className="h-6 w-6 text-blue-500 mt-1" />
            <div>
              <h4 className="font-semibold">Segurança e Confiabilidade</h4>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>✓ Confirmação apenas via gateway oficial</li>
                <li>✓ Validação de IP e assinatura</li>
                <li>✓ Registro completo de logs</li>
                <li>✓ Proteção contra fraudes manuais</li>
                <li>✓ Histórico auditável</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoVerificationManager;
