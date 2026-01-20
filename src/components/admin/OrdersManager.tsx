import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Package, Truck, RefreshCw, CheckCircle2, QrCode, History } from "lucide-react";

interface Order {
  id: string;
  order_nsu: string;
  status: string;
  total_amount: number;
  paid_amount: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  tracking_code: string | null;
  shipping_carrier: string | null;
  shipped_at: string | null;
  payment_method: string | null;
  pix_confirmed_by: string | null;
  pix_confirmed_at: string | null;
  created_at: string;
  items: unknown;
}

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_id: string;
  actor_email: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  pending: "Aguardando Pagamento",
  pending_pix: "Aguardando PIX",
  paid: "Pago",
  processing: "Em Preparação",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  pending_pix: "bg-orange-100 text-orange-800",
  paid: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const carriers = [
  { value: "correios", label: "Correios" },
  { value: "sedex", label: "Sedex" },
  { value: "pac", label: "PAC" },
  { value: "jadlog", label: "Jadlog" },
  { value: "loggi", label: "Loggi" },
  { value: "azul_cargo", label: "Azul Cargo" },
  { value: "outros", label: "Outros" },
];

const OrdersManager = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editTrackingCode, setEditTrackingCode] = useState("");
  const [editCarrier, setEditCarrier] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);

  // PIX confirmation dialog state
  const [pixDialogOpen, setPixDialogOpen] = useState(false);
  const [pixOrder, setPixOrder] = useState<Order | null>(null);
  const [pixNotes, setPixNotes] = useState("");
  const [confirmingPix, setConfirmingPix] = useState(false);

  // Audit logs dialog state
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Sessão expirada");
        return;
      }

      const { data, error } = await supabase.functions.invoke("admin-orders", {
        body: {
          action: "list_orders",
          status: statusFilter,
          search: searchQuery,
          page,
          limit,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setOrders(data.orders || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, page]);

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
  };

  const openEditDialog = (order: Order) => {
    setSelectedOrder(order);
    setEditTrackingCode(order.tracking_code || "");
    setEditCarrier(order.shipping_carrier || "");
    setEditStatus(order.status);
    setEditDialogOpen(true);
  };

  const handleSaveTracking = async () => {
    if (!selectedOrder) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-orders", {
        body: {
          action: "update_tracking",
          orderId: selectedOrder.id,
          trackingCode: editTrackingCode.trim(),
          shippingCarrier: editCarrier,
          status: editStatus,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Pedido atualizado com sucesso!");
      setEditDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Erro ao atualizar pedido");
    } finally {
      setSaving(false);
    }
  };

  // Open PIX confirmation dialog
  const openPixConfirmDialog = (order: Order) => {
    setPixOrder(order);
    setPixNotes("");
    setPixDialogOpen(true);
  };

  // Confirm PIX payment manually
  const handleConfirmPixPayment = async () => {
    if (!pixOrder) return;

    setConfirmingPix(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-orders", {
        body: {
          action: "confirm_pix_payment",
          orderId: pixOrder.id,
          notes: pixNotes.trim() || null,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Pagamento PIX confirmado com sucesso!");
      setPixDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Error confirming PIX payment:", error);
      toast.error("Erro ao confirmar pagamento PIX");
    } finally {
      setConfirmingPix(false);
    }
  };

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-orders", {
        body: {
          action: "get_audit_logs",
          page: 1,
          limit: 50,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setAuditLogs(data.logs || []);
      setAuditDialogOpen(true);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoadingAudit(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Gerenciar Pedidos
          </h2>
          <p className="text-muted-foreground">
            {total} pedido{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAuditLogs} disabled={loadingAudit}>
            <History className={`h-4 w-4 mr-2 ${loadingAudit ? "animate-spin" : ""}`} />
            Histórico
          </Button>
          <Button variant="outline" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por NSU, nome, email ou código de rastreio..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleSearch}>Buscar</Button>
      </div>

      {/* Orders Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rastreio</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Nenhum pedido encontrado
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-medium">
                    {order.order_nsu}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.customer_name || "-"}</p>
                      <p className="text-sm text-muted-foreground">{order.customer_email || "-"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[order.status] || "bg-gray-100"}>
                      {statusLabels[order.status] || order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {order.tracking_code ? (
                      <div>
                        <p className="font-mono text-sm">{order.tracking_code}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {order.shipping_carrier}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    R$ {(order.total_amount / 100).toFixed(2).replace(".", ",")}
                  </TableCell>
                  <TableCell>
                    {new Date(order.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {(order.status === "pending_pix" || order.status === "pending") && order.payment_method === "pix" && (
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => openPixConfirmDialog(order)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Confirmar PIX
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(order)}
                      >
                        <Truck className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Pedido</DialogTitle>
            <DialogDescription>
              Pedido: {selectedOrder?.order_nsu}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status do Pedido</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="carrier">Transportadora</Label>
              <Select value={editCarrier} onValueChange={setEditCarrier}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a transportadora" />
                </SelectTrigger>
                <SelectContent>
                  {carriers.map((carrier) => (
                    <SelectItem key={carrier.value} value={carrier.value}>
                      {carrier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tracking">Código de Rastreio</Label>
              <Input
                id="tracking"
                placeholder="Ex: BR123456789BR"
                value={editTrackingCode}
                onChange={(e) => setEditTrackingCode(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTracking} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIX Confirmation Dialog */}
      <Dialog open={pixDialogOpen} onOpenChange={setPixDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-green-600" />
              Confirmar Pagamento PIX
            </DialogTitle>
            <DialogDescription>
              Confirme manualmente o recebimento do pagamento PIX para este pedido.
            </DialogDescription>
          </DialogHeader>

          {pixOrder && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pedido</span>
                  <span className="font-mono font-medium">{pixOrder.order_nsu}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium">{pixOrder.customer_name || "-"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-bold text-green-600">
                    R$ {(pixOrder.total_amount / 100).toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Atenção:</strong> Confirme apenas após verificar o recebimento do valor na sua conta bancária.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pixNotes">Observações (opcional)</Label>
                <Input
                  id="pixNotes"
                  placeholder="Ex: Comprovante verificado"
                  value={pixNotes}
                  onChange={(e) => setPixNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPixDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmPixPayment} 
              disabled={confirmingPix}
              className="bg-green-600 hover:bg-green-700"
            >
              {confirmingPix ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar Pagamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Logs Dialog */}
      <Dialog open={auditDialogOpen} onOpenChange={setAuditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Ações
            </DialogTitle>
            <DialogDescription>
              Trilha de auditoria das confirmações de pagamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {auditLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum registro de auditoria encontrado.
              </p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {log.action === "confirm_pix_payment" ? "Confirmação PIX" : log.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">Pedido:</span>{" "}
                      <span className="font-mono">{(log.details as Record<string, string>).order_nsu || "-"}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Cliente:</span>{" "}
                      {(log.details as Record<string, string>).customer_name || "-"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Valor:</span>{" "}
                      <span className="font-medium text-green-600">
                        R$ {((log.details as Record<string, number>).paid_amount / 100).toFixed(2).replace(".", ",")}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Confirmado por:</span>{" "}
                      {(log.details as Record<string, string>).admin_name || log.actor_email || "-"}
                    </p>
                    {(log.details as Record<string, string>).notes && (
                      <p>
                        <span className="text-muted-foreground">Observações:</span>{" "}
                        {(log.details as Record<string, string>).notes}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAuditDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersManager;
