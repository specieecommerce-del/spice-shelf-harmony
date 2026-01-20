import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Search, Loader2, FileText, Download, Eye, RefreshCw, Building2, FileCheck, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import jsPDF from "jspdf";

interface Order {
  id: string;
  order_nsu: string;
  status: string;
  total_amount: number;
  paid_amount: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  payment_method: string | null;
  created_at: string;
  items: unknown;
  invoice_slug: string | null;
}

interface StoreInfo {
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
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

const InvoiceManager = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("paid");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Store info dialog
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    name: "Spice Shelf Harmony",
    cnpj: "",
    address: "",
    phone: "",
    email: "",
  });
  const [savingStore, setSavingStore] = useState(false);

  // Preview dialog
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
  // NF-e states
  const [emittingNfe, setEmittingNfe] = useState<string | null>(null);
  const [nfeDialogOpen, setNfeDialogOpen] = useState(false);
  const [nfeOrder, setNfeOrder] = useState<Order | null>(null);
  const [nfeStatus, setNfeStatus] = useState<{ ref: string; status: string; message: string } | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadStoreInfo();
    fetchOrders();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, page]);

  const loadStoreInfo = async () => {
    try {
      const { data } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "invoice_store_info")
        .maybeSingle();

      if (data?.value) {
        const info = data.value as unknown as StoreInfo;
        setStoreInfo(info);
      }
    } catch (error) {
      console.error("Error loading store info:", error);
    }
  };

  const saveStoreInfo = async () => {
    try {
      setSavingStore(true);
      
      // First try to update, if not exists, insert
      const { data: existing } = await supabase
        .from("store_settings")
        .select("id")
        .eq("key", "invoice_store_info")
        .maybeSingle();

      const jsonValue = JSON.parse(JSON.stringify(storeInfo));

      if (existing) {
        const { error } = await supabase
          .from("store_settings")
          .update({ value: jsonValue })
          .eq("key", "invoice_store_info");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("store_settings")
          .insert([{ 
            key: "invoice_store_info", 
            value: jsonValue 
          }]);
        if (error) throw error;
      }

      toast.success("Dados da loja salvos!");
      setStoreDialogOpen(false);
    } catch (error) {
      console.error("Error saving store info:", error);
      toast.error("Erro ao salvar dados da loja");
    } finally {
      setSavingStore(false);
    }
  };

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

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
  };

  const generatePDF = (order: Order, download: boolean = true) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Colors
    const primaryColor: [number, number, number] = [139, 90, 43]; // Brown/spice color
    const textColor: [number, number, number] = [51, 51, 51];
    const lightGray: [number, number, number] = [150, 150, 150];

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(storeInfo.name || "Spice Shelf Harmony", 20, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("COMPROVANTE DE COMPRA", pageWidth - 20, 25, { align: "right" });

    // Store info
    let y = 55;
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    
    if (storeInfo.cnpj) {
      doc.text(`CNPJ: ${storeInfo.cnpj}`, 20, y);
      y += 5;
    }
    if (storeInfo.address) {
      doc.text(storeInfo.address, 20, y);
      y += 5;
    }
    if (storeInfo.phone || storeInfo.email) {
      doc.text(`${storeInfo.phone}${storeInfo.phone && storeInfo.email ? " | " : ""}${storeInfo.email}`, 20, y);
      y += 5;
    }

    // Order info box
    y += 10;
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(15, y, pageWidth - 30, 35, 3, 3, "F");
    
    y += 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Pedido #${order.order_nsu}`, 20, y);
    
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...lightGray);
    doc.text(`Data: ${new Date(order.created_at).toLocaleDateString("pt-BR", { 
      day: "2-digit", 
      month: "long", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })}`, 20, y);
    
    y += 7;
    doc.text(`Status: ${statusLabels[order.status] || order.status}`, 20, y);

    // Customer info
    y += 20;
    doc.setTextColor(...textColor);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO CLIENTE", 20, y);
    
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Nome: ${order.customer_name || "Não informado"}`, 20, y);
    y += 6;
    doc.text(`Email: ${order.customer_email || "Não informado"}`, 20, y);
    y += 6;
    doc.text(`Telefone: ${order.customer_phone || "Não informado"}`, 20, y);

    // Items table
    y += 15;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("ITENS DO PEDIDO", 20, y);
    
    y += 8;
    
    // Table header
    doc.setFillColor(...primaryColor);
    doc.rect(15, y, pageWidth - 30, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("Produto", 20, y + 5.5);
    doc.text("Qtd", pageWidth - 70, y + 5.5);
    doc.text("Preço", pageWidth - 45, y + 5.5);
    doc.text("Subtotal", pageWidth - 25, y + 5.5, { align: "right" });
    
    y += 8;
    
    // Table rows
    doc.setTextColor(...textColor);
    const items = (order.items as Array<{ name: string; quantity: number; price: number }>) || [];
    
    items.forEach((item, index) => {
      const rowY = y + (index * 8);
      
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(15, rowY, pageWidth - 30, 8, "F");
      }
      
      doc.setFontSize(9);
      doc.text(item.name.substring(0, 40), 20, rowY + 5.5);
      doc.text(String(item.quantity), pageWidth - 70, rowY + 5.5);
      doc.text(`R$ ${(item.price / 100).toFixed(2)}`, pageWidth - 45, rowY + 5.5);
      doc.text(`R$ ${((item.price * item.quantity) / 100).toFixed(2)}`, pageWidth - 25, rowY + 5.5, { align: "right" });
    });

    y += items.length * 8 + 5;

    // Total
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(pageWidth - 85, y, 70, 20, 3, 3, "F");
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Total:", pageWidth - 80, y + 8);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text(`R$ ${(order.total_amount / 100).toFixed(2)}`, pageWidth - 20, y + 14, { align: "right" });

    // Payment method
    y += 30;
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const paymentMethod = order.payment_method === "pix" ? "PIX" : 
                          order.payment_method === "credit_card" ? "Cartão de Crédito" : 
                          order.payment_method || "Não informado";
    doc.text(`Forma de pagamento: ${paymentMethod}`, 20, y);

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFillColor(...primaryColor);
    doc.rect(0, footerY - 5, pageWidth, 25, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("Este documento é um comprovante de compra e não possui valor fiscal.", pageWidth / 2, footerY + 3, { align: "center" });
    doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, pageWidth / 2, footerY + 9, { align: "center" });

    if (download) {
      doc.save(`comprovante-${order.order_nsu}.pdf`);
      toast.success("Comprovante baixado!");
    }

    return doc;
  };

  const openPreview = (order: Order) => {
    setPreviewOrder(order);
    setPreviewDialogOpen(true);
  };

  const emitNfe = async (order: Order) => {
    setEmittingNfe(order.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada");
        return;
      }

      const { data, error } = await supabase.functions.invoke("focus-nfe", {
        body: {
          action: "emit",
          order_id: order.id,
        },
      });

      if (error) throw error;

      if (!data.success) {
        console.error("NF-e error:", data.error);
        toast.error("Erro ao emitir NF-e: " + (data.error?.mensagem || JSON.stringify(data.error)));
        return;
      }

      setNfeStatus({
        ref: data.ref,
        status: "processing",
        message: data.message || "NF-e enviada para processamento",
      });
      setNfeOrder(order);
      setNfeDialogOpen(true);
      toast.success("NF-e enviada para processamento!");
      fetchOrders(); // Refresh to get updated invoice_slug
    } catch (error) {
      console.error("Error emitting NF-e:", error);
      toast.error("Erro ao emitir NF-e");
    } finally {
      setEmittingNfe(null);
    }
  };

  const consultNfe = async (ref: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("focus-nfe", {
        body: {
          action: "consult",
          ref,
        },
      });

      if (error) throw error;

      if (data.data) {
        setNfeStatus({
          ref,
          status: data.data.status || "unknown",
          message: data.data.mensagem_sefaz || data.data.status || "Status consultado",
        });
      }
    } catch (error) {
      console.error("Error consulting NF-e:", error);
      toast.error("Erro ao consultar NF-e");
    }
  };

  const downloadDanfe = async (ref: string) => {
    try {
      toast.loading("Baixando DANFE...");
      const { data, error } = await supabase.functions.invoke("focus-nfe", {
        body: {
          action: "download_danfe",
          ref,
        },
      });

      toast.dismiss();

      if (error || !data.success) {
        toast.error("Erro ao baixar DANFE");
        return;
      }

      // Convert base64 to blob and download
      const byteCharacters = atob(data.pdf_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `danfe-${ref}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("DANFE baixado!");
    } catch (error) {
      console.error("Error downloading DANFE:", error);
      toast.error("Erro ao baixar DANFE");
    }
  };

  const downloadXml = async (ref: string) => {
    try {
      toast.loading("Baixando XML...");
      const { data, error } = await supabase.functions.invoke("focus-nfe", {
        body: {
          action: "download_xml",
          ref,
        },
      });

      toast.dismiss();

      if (error || !data.success) {
        toast.error("Erro ao baixar XML");
        return;
      }

      const blob = new Blob([data.xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nfe-${ref}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("XML baixado!");
    } catch (error) {
      console.error("Error downloading XML:", error);
      toast.error("Erro ao baixar XML");
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Comprovantes / Recibos
          </h2>
          <p className="text-muted-foreground">
            Gere comprovantes de compra em PDF para seus pedidos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStoreDialogOpen(true)}>
            <Building2 className="h-4 w-4 mr-2" />
            Dados da Loja
          </Button>
          <Button variant="outline" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Store info card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium">{storeInfo.name}</span>
            {storeInfo.cnpj && <span className="text-muted-foreground">CNPJ: {storeInfo.cnpj}</span>}
            {!storeInfo.cnpj && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                Configure os dados da loja para aparecer no comprovante
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
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
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="paid">Pagos</SelectItem>
            <SelectItem value="shipped">Enviados</SelectItem>
            <SelectItem value="delivered">Entregues</SelectItem>
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
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
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
                    <Badge variant="outline">
                      {statusLabels[order.status] || order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    R$ {(order.total_amount / 100).toFixed(2).replace(".", ",")}
                  </TableCell>
                  <TableCell>
                    {new Date(order.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <TooltipProvider>
                        {order.invoice_slug ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-300 hover:bg-green-50"
                                onClick={() => {
                                  setNfeOrder(order);
                                  consultNfe(order.invoice_slug!);
                                  setNfeDialogOpen(true);
                                }}
                              >
                                <FileCheck className="h-4 w-4 mr-1" />
                                NF-e
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>NF-e já emitida - Clique para ver detalhes</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => emitNfe(order)}
                                disabled={emittingNfe === order.id}
                              >
                                {emittingNfe === order.id ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <FileCheck className="h-4 w-4 mr-1" />
                                )}
                                Emitir NF-e
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Emitir Nota Fiscal Eletrônica para este pedido</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TooltipProvider>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPreview(order)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => generatePDF(order)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
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

      {/* Store Info Dialog */}
      <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dados da Loja</DialogTitle>
            <DialogDescription>
              Essas informações aparecerão no cabeçalho do comprovante
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Nome da Loja</Label>
              <Input
                id="storeName"
                value={storeInfo.name}
                onChange={(e) => setStoreInfo((s) => ({ ...s, name: e.target.value }))}
                placeholder="Nome da sua loja"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={storeInfo.cnpj}
                onChange={(e) => setStoreInfo((s) => ({ ...s, cnpj: e.target.value }))}
                placeholder="00.000.000/0001-00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={storeInfo.address}
                onChange={(e) => setStoreInfo((s) => ({ ...s, address: e.target.value }))}
                placeholder="Rua, número, cidade - UF"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={storeInfo.phone}
                  onChange={(e) => setStoreInfo((s) => ({ ...s, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={storeInfo.email}
                  onChange={(e) => setStoreInfo((s) => ({ ...s, email: e.target.value }))}
                  placeholder="contato@loja.com"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStoreDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveStoreInfo} disabled={savingStore}>
              {savingStore && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pré-visualização do Comprovante</DialogTitle>
            <DialogDescription>
              Pedido #{previewOrder?.order_nsu}
            </DialogDescription>
          </DialogHeader>

          {previewOrder && (
            <div className="space-y-4 py-4">
              <Card>
                <CardHeader className="bg-primary/10 rounded-t-lg">
                  <CardTitle className="text-lg">{storeInfo.name}</CardTitle>
                  {storeInfo.cnpj && (
                    <CardDescription>CNPJ: {storeInfo.cnpj}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Pedido</p>
                      <p className="text-muted-foreground">#{previewOrder.order_nsu}</p>
                    </div>
                    <div>
                      <p className="font-medium">Data</p>
                      <p className="text-muted-foreground">
                        {new Date(previewOrder.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="font-medium mb-2">Cliente</p>
                    <p className="text-sm">{previewOrder.customer_name || "Não informado"}</p>
                    <p className="text-sm text-muted-foreground">{previewOrder.customer_email}</p>
                  </div>

                  <div className="border-t pt-4">
                    <p className="font-medium mb-2">Itens</p>
                    <div className="space-y-2">
                      {((previewOrder.items as Array<{ name: string; quantity: number; price: number }>) || []).map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>{item.name} x{item.quantity}</span>
                          <span>R$ {((item.price * item.quantity) / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4 flex justify-between items-center">
                    <span className="font-medium">Total</span>
                    <span className="text-xl font-bold text-primary">
                      R$ {(previewOrder.total_amount / 100).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Fechar
            </Button>
            {previewOrder && (
              <Button onClick={() => generatePDF(previewOrder)}>
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NF-e Status Dialog */}
      <Dialog open={nfeDialogOpen} onOpenChange={setNfeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Nota Fiscal Eletrônica
            </DialogTitle>
            <DialogDescription>
              Pedido #{nfeOrder?.order_nsu}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {nfeStatus ? (
              <Card>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Referência</span>
                    <span className="font-mono text-sm">{nfeStatus.ref}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge 
                      variant={
                        nfeStatus.status === "autorizado" ? "default" :
                        nfeStatus.status === "processing" ? "secondary" :
                        nfeStatus.status === "erro_autorizacao" ? "destructive" : "outline"
                      }
                    >
                      {nfeStatus.status === "autorizado" ? "Autorizado" :
                       nfeStatus.status === "processing" || nfeStatus.status === "processando_autorizacao" ? "Processando" :
                       nfeStatus.status === "erro_autorizacao" ? "Erro" : nfeStatus.status}
                    </Badge>
                  </div>
                  
                  <div className="border-t pt-4">
                    <span className="text-sm text-muted-foreground">Mensagem</span>
                    <p className="mt-1 text-sm">{nfeStatus.message}</p>
                  </div>

                  {nfeStatus.status === "autorizado" && (
                    <div className="border-t pt-4 flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadDanfe(nfeStatus.ref)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Baixar DANFE
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadXml(nfeStatus.ref)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Baixar XML
                      </Button>
                    </div>
                  )}

                  {(nfeStatus.status === "processing" || nfeStatus.status === "processando_autorizacao") && (
                    <div className="border-t pt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => consultNfe(nfeStatus.ref)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Atualizar Status
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNfeDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceManager;
