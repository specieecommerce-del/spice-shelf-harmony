import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Loader2, 
  PackageOpen, 
  Truck, 
  RefreshCw, 
  Printer, 
  CheckSquare,
  Package,
  MapPin
} from "lucide-react";

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
  created_at: string;
  items: unknown;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
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

const ShippingManager = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 50;

  // Bulk shipping dialog
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkCarrier, setBulkCarrier] = useState("");
  const [bulkTrackingPrefix, setBulkTrackingPrefix] = useState("");
  const [processingBulk, setProcessingBulk] = useState(false);

  // Order details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Sessão expirada");
        return;
      }

      // Fetch orders that are paid or in processing - ready for shipping
      const { data, error } = await supabase.functions.invoke("admin-orders", {
        body: {
          action: "list_orders",
          status: "all",
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

      // Filter orders ready for shipping (paid, processing) or already shipped
      const shippingOrders = (data.orders || []).filter((order: Order) => 
        ["paid", "processing", "shipped", "delivered"].includes(order.status)
      );

      setOrders(shippingOrders);
      setTotal(shippingOrders.length);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const selectAllPending = () => {
    const pendingOrders = orders.filter(o => o.status === "paid" || o.status === "processing");
    setSelectedOrders(new Set(pendingOrders.map(o => o.id)));
  };

  const clearSelection = () => {
    setSelectedOrders(new Set());
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrderDetails(order);
    setDetailsDialogOpen(true);
  };

  const markAsProcessing = async (orderId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-orders", {
        body: {
          action: "update_tracking",
          orderId,
          status: "processing",
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Pedido marcado como em preparação!");
      fetchOrders();
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Erro ao atualizar pedido");
    }
  };

  const handleBulkShip = async () => {
    if (selectedOrders.size === 0) {
      toast.error("Selecione pelo menos um pedido");
      return;
    }

    if (!bulkCarrier) {
      toast.error("Selecione uma transportadora");
      return;
    }

    setProcessingBulk(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const orderId of selectedOrders) {
        const order = orders.find(o => o.id === orderId);
        if (!order) continue;

        const { data, error } = await supabase.functions.invoke("admin-orders", {
          body: {
            action: "update_tracking",
            orderId,
            trackingCode: bulkTrackingPrefix ? `${bulkTrackingPrefix}${order.order_nsu}` : "",
            shippingCarrier: bulkCarrier,
            status: "shipped",
          },
        });

        if (error || data?.error) {
          errorCount++;
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} pedido(s) marcado(s) como enviado(s)!`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} pedido(s) com erro`);
      }

      setBulkDialogOpen(false);
      setSelectedOrders(new Set());
      fetchOrders();
    } catch (error) {
      console.error("Error bulk shipping:", error);
      toast.error("Erro ao processar envios");
    } finally {
      setProcessingBulk(false);
    }
  };

  const parseItems = (items: unknown): OrderItem[] => {
    if (!items) return [];
    if (Array.isArray(items)) return items as OrderItem[];
    return [];
  };

  const printSeparationList = () => {
    const selectedOrdersList = orders.filter(o => selectedOrders.has(o.id));
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lista de Separação</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 30px; }
          .order { border: 1px solid #ccc; margin-bottom: 20px; padding: 15px; page-break-inside: avoid; }
          .order-header { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px; }
          .customer { margin-bottom: 10px; }
          .items-table { width: 100%; border-collapse: collapse; }
          .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .items-table th { background-color: #f5f5f5; }
          .checkbox { width: 30px; height: 30px; border: 2px solid #333; display: inline-block; margin-right: 10px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h1>Lista de Separação - ${new Date().toLocaleDateString('pt-BR')}</h1>
        ${selectedOrdersList.map(order => {
          const items = parseItems(order.items);
          return `
            <div class="order">
              <div class="order-header">
                <div><strong>Pedido:</strong> ${order.order_nsu}</div>
                <div><strong>Data:</strong> ${new Date(order.created_at).toLocaleDateString('pt-BR')}</div>
              </div>
              <div class="customer">
                <strong>Cliente:</strong> ${order.customer_name || '-'}<br>
                <strong>Email:</strong> ${order.customer_email || '-'}<br>
                <strong>Telefone:</strong> ${order.customer_phone || '-'}
              </div>
              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 40px;"></th>
                    <th>Produto</th>
                    <th style="width: 80px;">Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(item => `
                    <tr>
                      <td><span class="checkbox"></span></td>
                      <td>${item.name}</td>
                      <td>${item.quantity}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }).join('')}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Summary stats
  const paidOrders = orders.filter(o => o.status === "paid").length;
  const processingOrders = orders.filter(o => o.status === "processing").length;
  const shippedOrders = orders.filter(o => o.status === "shipped").length;
  const deliveredOrders = orders.filter(o => o.status === "delivered").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <PackageOpen className="h-6 w-6" />
            Histórico de Compras & Envios
          </h2>
          <p className="text-muted-foreground">
            Separação e gerenciamento de envios dos pedidos
          </p>
        </div>
        <Button variant="outline" onClick={fetchOrders} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{paidOrders}</div>
            <p className="text-xs text-muted-foreground">Aguardando separação</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Preparação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{processingOrders}</div>
            <p className="text-xs text-muted-foreground">Sendo separados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enviados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{shippedOrders}</div>
            <p className="text-xs text-muted-foreground">Em trânsito</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entregues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{deliveredOrders}</div>
            <p className="text-xs text-muted-foreground">Finalizados</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por NSU, nome ou email..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button variant="outline" onClick={selectAllPending}>
          <CheckSquare className="h-4 w-4 mr-2" />
          Selecionar Pendentes
        </Button>
        {selectedOrders.size > 0 && (
          <>
            <Button variant="outline" onClick={printSeparationList}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Lista ({selectedOrders.size})
            </Button>
            <Button onClick={() => setBulkDialogOpen(true)}>
              <Truck className="h-4 w-4 mr-2" />
              Marcar Enviados ({selectedOrders.size})
            </Button>
          </>
        )}
      </div>

      {/* Orders Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedOrders.size > 0 && selectedOrders.size === orders.filter(o => o.status === "paid" || o.status === "processing").length}
                  onCheckedChange={(checked) => checked ? selectAllPending() : clearSelection()}
                />
              </TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rastreio</TableHead>
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
              orders.map((order) => {
                const items = parseItems(order.items);
                const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
                
                return (
                  <TableRow key={order.id} className={selectedOrders.has(order.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedOrders.has(order.id)}
                        onCheckedChange={() => toggleOrderSelection(order.id)}
                        disabled={order.status === "shipped" || order.status === "delivered"}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-mono font-medium">{order.order_nsu}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customer_name || "-"}</p>
                        <p className="text-sm text-muted-foreground">{order.customer_phone || "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openOrderDetails(order)}
                        className="flex items-center gap-1"
                      >
                        <Package className="h-4 w-4" />
                        {totalItems} item(s)
                      </Button>
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {order.status === "paid" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsProcessing(order.id)}
                          >
                            <MapPin className="h-4 w-4 mr-1" />
                            Separar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bulk Shipping Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar Pedidos como Enviados</DialogTitle>
            <DialogDescription>
              {selectedOrders.size} pedido(s) selecionado(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Transportadora</Label>
              <Select value={bulkCarrier} onValueChange={setBulkCarrier}>
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
              <Label>Prefixo do Código de Rastreio (opcional)</Label>
              <Input
                placeholder="Ex: BR"
                value={bulkTrackingPrefix}
                onChange={(e) => setBulkTrackingPrefix(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-muted-foreground">
                O código final será: {bulkTrackingPrefix || "PREFIXO"}[NSU_PEDIDO]
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkShip} disabled={processingBulk}>
              {processingBulk && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
            <DialogDescription>
              Pedido: {selectedOrderDetails?.order_nsu}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Cliente</Label>
              <p className="font-medium">{selectedOrderDetails?.customer_name || "-"}</p>
              <p className="text-sm">{selectedOrderDetails?.customer_email}</p>
              <p className="text-sm">{selectedOrderDetails?.customer_phone}</p>
            </div>

            <div>
              <Label className="text-muted-foreground">Itens do Pedido</Label>
              <div className="mt-2 border rounded-lg divide-y">
                {selectedOrderDetails && parseItems(selectedOrderDetails.items).map((item, index) => (
                  <div key={index} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {(item.price / 100).toFixed(2).replace(".", ",")} un.
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-lg">
                      x{item.quantity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <span className="font-medium">Total:</span>
              <span className="font-bold text-lg">
                R$ {selectedOrderDetails ? (selectedOrderDetails.total_amount / 100).toFixed(2).replace(".", ",") : "0,00"}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShippingManager;
