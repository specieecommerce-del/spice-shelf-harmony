import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, XCircle, Clock, RefreshCw, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  transaction_nsu: string | null;
}

const PaymentLogsManager = () => {
  const [orders, setOrders] = useState<OrderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("orders")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order.order_nsu.toLowerCase().includes(search) ||
      order.customer_name?.toLowerCase().includes(search) ||
      order.customer_email?.toLowerCase().includes(search) ||
      order.transaction_nsu?.toLowerCase().includes(search)
    );
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-500/10 text-green-700 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            PAGO
          </Badge>
        );
      case "pending":
      case "pending_pix":
      case "pending_boleto":
        return (
          <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            PENDENTE
          </Badge>
        );
      case "failed":
      case "cancelled":
        return (
          <Badge className="bg-red-500/10 text-red-700 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            {status === "failed" ? "FALHOU" : "CANCELADO"}
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/30">
            <Clock className="h-3 w-3 mr-1" />
            PROCESSANDO
          </Badge>
        );
      case "shipped":
        return (
          <Badge className="bg-purple-500/10 text-purple-700 border-purple-500/30">
            ENVIADO
          </Badge>
        );
      case "delivered":
        return (
          <Badge className="bg-teal-500/10 text-teal-700 border-teal-500/30">
            ENTREGUE
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
          <h2 className="text-2xl font-bold">Logs de Pagamentos</h2>
          <p className="text-muted-foreground">
            Histórico completo de todas as transações
          </p>
        </div>
        <Button onClick={fetchOrders} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por pedido, cliente ou transação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="pending_pix">Aguardando PIX</SelectItem>
                <SelectItem value="pending_boleto">Aguardando Boleto</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
                <SelectItem value="shipped">Enviados</SelectItem>
                <SelectItem value="delivered">Entregues</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Histórico de Confirmações</span>
            <span className="text-sm font-normal text-muted-foreground">
              {filteredOrders.length} registros
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum registro encontrado
            </p>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">#{order.order_nsu}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Cliente: {order.customer_name || "Não informado"}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Pagamento: {getPaymentMethodLabel(order.payment_method)}</span>
                      {order.transaction_nsu && (
                        <span>NSU: {order.transaction_nsu}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-semibold">
                      {formatCurrency(order.paid_amount || order.total_amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Criado:{" "}
                      {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Atualizado:{" "}
                      {format(new Date(order.updated_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
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

export default PaymentLogsManager;
