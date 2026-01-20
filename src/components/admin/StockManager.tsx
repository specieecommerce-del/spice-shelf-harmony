import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Search,
  Loader2,
  RefreshCw,
  Plus,
  Minus,
  History,
  ShieldCheck,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  PackageX,
  Calendar,
  TrendingUp,
  TrendingDown,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  reserved_stock: number;
  low_stock_threshold: number;
  image_url: string | null;
  price: number;
  is_active: boolean;
}

interface StockMovement {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string | null;
  reference_type: string | null;
  notes: string | null;
  created_at: string;
  products?: {
    name: string;
  };
}

const movementTypeLabels: Record<string, string> = {
  entry: "Entrada",
  exit: "Saída",
  adjustment: "Ajuste",
  reservation: "Reserva",
  sale: "Venda",
};

const movementTypeColors: Record<string, string> = {
  entry: "bg-green-100 text-green-800",
  exit: "bg-red-100 text-red-800",
  adjustment: "bg-blue-100 text-blue-800",
  reservation: "bg-purple-100 text-purple-800",
  sale: "bg-orange-100 text-orange-800",
};

const StockManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("inventory");

  // Movement dialog
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<"entry" | "exit">("entry");
  const [movementQuantity, setMovementQuantity] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [movementNotes, setMovementNotes] = useState("");
  const [processingMovement, setProcessingMovement] = useState(false);

  // Reserve dialog
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [reserveQuantity, setReserveQuantity] = useState("");
  const [processingReserve, setProcessingReserve] = useState(false);

  // History dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [productHistory, setProductHistory] = useState<StockMovement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      let query = supabase
        .from("products")
        .select("id, name, stock_quantity, reserved_stock, low_stock_threshold, image_url, price, is_active")
        .order("name");

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Erro ao carregar produtos");
    }
  }, [searchQuery]);

  const fetchMovements = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          *,
          products:product_id (name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error("Error fetching movements:", error);
    }
  }, []);

  const fetchProductHistory = async (productId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setProductHistory(data || []);
    } catch (error) {
      console.error("Error fetching product history:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchMovements()]);
      setLoading(false);
    };
    loadData();
  }, [fetchProducts, fetchMovements]);

  const handleSearch = () => {
    fetchProducts();
  };

  const openMovementDialog = (product: Product, type: "entry" | "exit") => {
    setSelectedProduct(product);
    setMovementType(type);
    setMovementQuantity("");
    setMovementReason("");
    setMovementNotes("");
    setMovementDialogOpen(true);
  };

  const openReserveDialog = (product: Product) => {
    setSelectedProduct(product);
    setReserveQuantity(product.reserved_stock.toString());
    setReserveDialogOpen(true);
  };

  const openHistoryDialog = async (product: Product) => {
    setSelectedProduct(product);
    setHistoryDialogOpen(true);
    await fetchProductHistory(product.id);
  };

  const handleMovement = async () => {
    if (!selectedProduct || !movementQuantity || !movementReason) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const qty = parseInt(movementQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantidade inválida");
      return;
    }

    if (movementType === "exit" && qty > selectedProduct.stock_quantity) {
      toast.error("Quantidade maior que o estoque disponível");
      return;
    }

    setProcessingMovement(true);
    try {
      const newQuantity = movementType === "entry" 
        ? selectedProduct.stock_quantity + qty 
        : selectedProduct.stock_quantity - qty;

      // First, insert the movement record
      const { error: movementError } = await supabase
        .from("stock_movements")
        .insert({
          product_id: selectedProduct.id,
          movement_type: movementType,
          quantity: qty,
          previous_quantity: selectedProduct.stock_quantity,
          new_quantity: newQuantity,
          reason: movementReason,
          reference_type: "manual",
          notes: movementNotes || null,
        });

      if (movementError) throw movementError;

      // Then update the product stock (this will trigger the log function but we already logged it)
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock_quantity: newQuantity })
        .eq("id", selectedProduct.id);

      if (updateError) throw updateError;

      toast.success(`${movementType === "entry" ? "Entrada" : "Saída"} registrada com sucesso!`);
      setMovementDialogOpen(false);
      fetchProducts();
      fetchMovements();
    } catch (error) {
      console.error("Error processing movement:", error);
      toast.error("Erro ao processar movimentação");
    } finally {
      setProcessingMovement(false);
    }
  };

  const handleReserve = async () => {
    if (!selectedProduct) return;

    const qty = parseInt(reserveQuantity);
    if (isNaN(qty) || qty < 0) {
      toast.error("Quantidade inválida");
      return;
    }

    if (qty > selectedProduct.stock_quantity) {
      toast.error("Reserva não pode ser maior que o estoque total");
      return;
    }

    setProcessingReserve(true);
    try {
      // Log the reservation change
      if (qty !== selectedProduct.reserved_stock) {
        await supabase
          .from("stock_movements")
          .insert({
            product_id: selectedProduct.id,
            movement_type: "reservation",
            quantity: Math.abs(qty - selectedProduct.reserved_stock),
            previous_quantity: selectedProduct.reserved_stock,
            new_quantity: qty,
            reason: qty > selectedProduct.reserved_stock ? "Aumento de estoque de segurança" : "Redução de estoque de segurança",
            reference_type: "manual",
          });
      }

      const { error } = await supabase
        .from("products")
        .update({ reserved_stock: qty })
        .eq("id", selectedProduct.id);

      if (error) throw error;

      toast.success("Estoque de segurança atualizado!");
      setReserveDialogOpen(false);
      fetchProducts();
      fetchMovements();
    } catch (error) {
      console.error("Error updating reserve:", error);
      toast.error("Erro ao atualizar reserva");
    } finally {
      setProcessingReserve(false);
    }
  };

  const getStockStatus = (product: Product) => {
    const availableStock = product.stock_quantity - product.reserved_stock;
    if (product.stock_quantity === 0) return { label: "Esgotado", color: "bg-red-100 text-red-800" };
    if (availableStock <= 0) return { label: "Só Reserva", color: "bg-purple-100 text-purple-800" };
    if (product.stock_quantity <= product.low_stock_threshold) return { label: "Baixo", color: "bg-orange-100 text-orange-800" };
    return { label: "Normal", color: "bg-green-100 text-green-800" };
  };

  // Stats
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.stock_quantity, 0);
  const totalReserved = products.reduce((sum, p) => sum + p.reserved_stock, 0);
  const lowStockCount = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold).length;
  const outOfStockCount = products.filter(p => p.stock_quantity === 0).length;

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
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Gestão de Estoque
          </h2>
          <p className="text-muted-foreground">
            Controle de entradas, saídas e estoque de segurança
          </p>
        </div>
        <Button variant="outline" onClick={() => { fetchProducts(); fetchMovements(); }} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalProducts}</p>
                <p className="text-xs text-muted-foreground">Produtos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalStock}</p>
                <p className="text-xs text-muted-foreground">Estoque Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{totalReserved}</p>
                <p className="text-xs text-muted-foreground">Reservado</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? "border-orange-300 bg-orange-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-8 w-8 ${lowStockCount > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
              <div>
                <p className="text-2xl font-bold">{lowStockCount}</p>
                <p className="text-xs text-muted-foreground">Estoque Baixo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={outOfStockCount > 0 ? "border-red-300 bg-red-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <PackageX className={`h-8 w-8 ${outOfStockCount > 0 ? "text-red-500" : "text-muted-foreground"}`} />
              <div>
                <p className="text-2xl font-bold">{outOfStockCount}</p>
                <p className="text-xs text-muted-foreground">Esgotados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventário
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Movimentações
          </TabsTrigger>
          <TabsTrigger value="reserved" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Estoque de Segurança
          </TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar produto..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>
              Buscar
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead className="text-center">Reservado</TableHead>
                  <TableHead className="text-center">Disponível</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhum produto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => {
                    const status = getStockStatus(product);
                    const available = product.stock_quantity - product.reserved_stock;
                    
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Limite baixo: {product.low_stock_threshold}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-lg font-bold">{product.stock_quantity}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-lg font-medium text-purple-600">{product.reserved_stock}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-lg font-bold ${available <= 0 ? "text-red-600" : "text-green-600"}`}>
                            {available}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={status.color}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openMovementDialog(product, "entry")}
                              title="Entrada"
                            >
                              <ArrowUpCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openMovementDialog(product, "exit")}
                              title="Saída"
                              disabled={product.stock_quantity === 0}
                            >
                              <ArrowDownCircle className="h-4 w-4 text-red-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openHistoryDialog(product)}
                              title="Histórico"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Movimentações
              </CardTitle>
              <CardDescription>
                Últimas 100 movimentações de estoque
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-center">Anterior</TableHead>
                      <TableHead className="text-center">Novo</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          Nenhuma movimentação registrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      movements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell>
                            <div className="text-sm">
                              <p>{format(new Date(movement.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(movement.created_at), "HH:mm")}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{movement.products?.name || "—"}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={movementTypeColors[movement.movement_type] || "bg-gray-100"}>
                              {movementTypeLabels[movement.movement_type] || movement.movement_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {movement.movement_type === "entry" || movement.new_quantity > movement.previous_quantity ? (
                                <Plus className="h-3 w-3 text-green-600" />
                              ) : (
                                <Minus className="h-3 w-3 text-red-600" />
                              )}
                              <span className="font-medium">{movement.quantity}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {movement.previous_quantity}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {movement.new_quantity}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{movement.reason || "—"}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reserved Stock Tab */}
        <TabsContent value="reserved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-purple-600" />
                Estoque de Segurança
              </CardTitle>
              <CardDescription>
                Reserve uma quantidade de cada produto como estoque morto para garantir segurança em caso de picos de demanda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Estoque Total</TableHead>
                      <TableHead className="text-center">Reservado</TableHead>
                      <TableHead className="text-center">Disponível p/ Venda</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const available = product.stock_quantity - product.reserved_stock;
                      const reservePercent = product.stock_quantity > 0 
                        ? Math.round((product.reserved_stock / product.stock_quantity) * 100) 
                        : 0;
                      
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="h-10 w-10 rounded object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <span className="font-medium">{product.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-lg font-bold">{product.stock_quantity}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div>
                              <span className="text-lg font-bold text-purple-600">{product.reserved_stock}</span>
                              {reservePercent > 0 && (
                                <p className="text-xs text-muted-foreground">({reservePercent}%)</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-lg font-bold ${available <= 0 ? "text-red-600" : "text-green-600"}`}>
                              {available}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReserveDialog(product)}
                            >
                              <ShieldCheck className="h-4 w-4 mr-1" />
                              Ajustar Reserva
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Movement Dialog */}
      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {movementType === "entry" ? (
                <>
                  <ArrowUpCircle className="h-5 w-5 text-green-600" />
                  Entrada de Estoque
                </>
              ) : (
                <>
                  <ArrowDownCircle className="h-5 w-5 text-red-600" />
                  Saída de Estoque
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct?.name} - Estoque atual: {selectedProduct?.stock_quantity}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantidade *</Label>
              <Input
                type="number"
                min="1"
                max={movementType === "exit" ? selectedProduct?.stock_quantity : undefined}
                placeholder="Digite a quantidade"
                value={movementQuantity}
                onChange={(e) => setMovementQuantity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Select value={movementReason} onValueChange={setMovementReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {movementType === "entry" ? (
                    <>
                      <SelectItem value="Compra de fornecedor">Compra de fornecedor</SelectItem>
                      <SelectItem value="Devolução de cliente">Devolução de cliente</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                      <SelectItem value="Ajuste de inventário">Ajuste de inventário</SelectItem>
                      <SelectItem value="Produção">Produção</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Venda manual">Venda manual</SelectItem>
                      <SelectItem value="Perda/Avaria">Perda/Avaria</SelectItem>
                      <SelectItem value="Vencimento">Vencimento</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                      <SelectItem value="Ajuste de inventário">Ajuste de inventário</SelectItem>
                      <SelectItem value="Amostra/Brinde">Amostra/Brinde</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Detalhes adicionais..."
                value={movementNotes}
                onChange={(e) => setMovementNotes(e.target.value)}
              />
            </div>

            {movementQuantity && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Novo estoque:</strong>{" "}
                  {movementType === "entry"
                    ? (selectedProduct?.stock_quantity || 0) + parseInt(movementQuantity || "0")
                    : (selectedProduct?.stock_quantity || 0) - parseInt(movementQuantity || "0")}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMovement} disabled={processingMovement}>
              {processingMovement && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar {movementType === "entry" ? "Entrada" : "Saída"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reserve Dialog */}
      <Dialog open={reserveDialogOpen} onOpenChange={setReserveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              Estoque de Segurança
            </DialogTitle>
            <DialogDescription>
              {selectedProduct?.name} - Estoque total: {selectedProduct?.stock_quantity}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-800">
                <strong>Estoque de Segurança</strong> é uma reserva que não estará disponível para venda.
                Use para garantir que você sempre tenha produtos em caso de aumento repentino de demanda.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Quantidade Reservada</Label>
              <Input
                type="number"
                min="0"
                max={selectedProduct?.stock_quantity}
                placeholder="0"
                value={reserveQuantity}
                onChange={(e) => setReserveQuantity(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Disponível para venda: {(selectedProduct?.stock_quantity || 0) - parseInt(reserveQuantity || "0")} unidades
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReserveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReserve} disabled={processingReserve}>
              {processingReserve && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Reserva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Movimentações
            </DialogTitle>
            <DialogDescription>
              {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto">
            {loadingHistory ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : productHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma movimentação registrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {productHistory.map((movement) => (
                  <div key={movement.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className={`p-2 rounded-full ${
                      movement.movement_type === "entry" ? "bg-green-100" : 
                      movement.movement_type === "exit" || movement.movement_type === "sale" ? "bg-red-100" : 
                      "bg-purple-100"
                    }`}>
                      {movement.movement_type === "entry" ? (
                        <ArrowUpCircle className="h-4 w-4 text-green-600" />
                      ) : movement.movement_type === "exit" || movement.movement_type === "sale" ? (
                        <ArrowDownCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <RotateCcw className="h-4 w-4 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <Badge className={movementTypeColors[movement.movement_type] || "bg-gray-100"}>
                          {movementTypeLabels[movement.movement_type] || movement.movement_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(movement.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm mt-1">
                        <span className="text-muted-foreground">Quantidade:</span>{" "}
                        <strong>{movement.quantity}</strong>
                        <span className="text-muted-foreground"> ({movement.previous_quantity} → {movement.new_quantity})</span>
                      </p>
                      {movement.reason && (
                        <p className="text-sm text-muted-foreground">{movement.reason}</p>
                      )}
                      {movement.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{movement.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockManager;
