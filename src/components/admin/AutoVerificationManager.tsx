import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Clock, Zap, Shield, RefreshCw, Radio, Timer, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

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
  confirmation_mode: string | null;
  confirmation_source: string | null;
}

const AutoVerificationManager = () => {
  const [recentOrders, setRecentOrders] = useState<OrderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningVerification, setRunningVerification] = useState(false);
  const [stats, setStats] = useState({
    totalAutoConfirmed: 0,
    todayConfirmed: 0,
    pendingCount: 0,
    realtimeCount: 0,
    periodicCount: 0,
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

      const realtimeCount = paidOrders?.filter(o => o.confirmation_mode === 'realtime').length || 0;
      const periodicCount = paidOrders?.filter(o => o.confirmation_mode === 'periodic').length || 0;

      setRecentOrders(paidOrders || []);
      setStats({
        totalAutoConfirmed: paidOrders?.length || 0,
        todayConfirmed,
        pendingCount: pendingOrders?.length || 0,
        realtimeCount,
        periodicCount,
      });
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const runPeriodicVerification = async () => {
    setRunningVerification(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-pending-payments');
      
      if (error) throw error;
      
      toast.success(`Verificação concluída: ${data.confirmed} confirmados, ${data.still_pending} pendentes`);
      fetchData();
    } catch (error) {
      console.error("Erro ao executar verificação:", error);
      toast.error("Erro ao executar verificação periódica");
    } finally {
      setRunningVerification(false);
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

  const getConfirmationModeLabel = (mode: string | null) => {
    switch (mode) {
      case "realtime":
        return { label: "Tempo Real", icon: Zap, color: "text-green-600 bg-green-100" };
      case "periodic":
        return { label: "Verificação Periódica", icon: Timer, color: "text-blue-600 bg-blue-100" };
      case "manual":
        return { label: "Manual", icon: Shield, color: "text-amber-600 bg-amber-100" };
      default:
        return { label: "Automático", icon: CheckCircle2, color: "text-gray-600 bg-gray-100" };
    }
  };

  const getConfirmationSourceLabel = (source: string | null) => {
    switch (source) {
      case "infinitepay_webhook":
        return "InfinitePay";
      case "pagseguro_webhook":
        return "PagSeguro";
      case "gateway_api":
        return "API Gateway";
      case "periodic_check":
        return "Verificação Automática";
      case "manual":
        return "Confirmação Manual";
      default:
        return source || "Sistema";
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
            Sistema de confirmação dupla: tempo real + verificação periódica
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runPeriodicVerification} 
            variant="default" 
            size="sm"
            disabled={runningVerification}
          >
            {runningVerification ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Timer className="h-4 w-4 mr-2" />
            )}
            Verificar Agora
          </Button>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Status do Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-full">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Tempo Real (Webhook)</h3>
                <p className="text-sm text-muted-foreground">
                  Confirmação instantânea via gateway
                </p>
              </div>
              <Badge className="bg-green-500 text-white">
                <Radio className="h-3 w-3 mr-1 animate-pulse" />
                Ativo
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-full">
                <Timer className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Verificação Periódica</h3>
                <p className="text-sm text-muted-foreground">
                  Backup automático para pendentes
                </p>
              </div>
              <Badge className="bg-blue-500 text-white">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Ativo
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              Via Tempo Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats.realtimeCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Via Periódica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats.periodicCount}</span>
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

      {/* Fluxo do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como Funciona o Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-center justify-center py-4">
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-lg">
              <span className="font-medium">1. Cliente paga</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-lg border border-green-500/30">
              <Zap className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-700">2. Webhook (instantâneo)</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-lg">
              <span className="font-medium">3. Sistema valida</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-lg border border-green-500/30">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-700">4. Pedido PAGO</span>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              <span>Se falhar:</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-500/20 px-3 py-1 rounded border border-blue-500/30">
              <Timer className="h-3 w-3 text-blue-600" />
              <span className="text-blue-700">Verificação periódica detecta e confirma</span>
            </div>
          </div>
          
          <p className="text-center text-sm text-muted-foreground mt-4">
            ✅ Zero intervenção manual • ✅ Dupla verificação • ✅ Tempo real + backup
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
              {recentOrders.map((order) => {
                const modeInfo = getConfirmationModeLabel(order.confirmation_mode);
                const ModeIcon = modeInfo.icon;
                
                return (
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
                        {format(new Date(order.updated_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                      <div className={`text-xs flex items-center justify-end gap-1 px-2 py-1 rounded ${modeInfo.color}`}>
                        <ModeIcon className="h-3 w-3" />
                        <span>{modeInfo.label}</span>
                        {order.confirmation_source && (
                          <span className="opacity-75">• {getConfirmationSourceLabel(order.confirmation_source)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Garantias do Sistema */}
      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Shield className="h-6 w-6 text-blue-500 mt-1" />
            <div>
              <h4 className="font-semibold">Garantias do Sistema</h4>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>✓ Confirmação automática real</div>
                <div>✓ Dupla verificação ativa</div>
                <div>✓ Funciona com vários gateways</div>
                <div>✓ Zero ação manual necessária</div>
                <div>✓ Notificações automáticas (Email + WhatsApp)</div>
                <div>✓ Logs completos para auditoria</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoVerificationManager;
