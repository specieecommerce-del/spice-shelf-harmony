import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pencil,
  Trash2,
  Plus,
  Upload,
  Loader2,
  ImageIcon,
  RefreshCw,
  AlertTriangle,
  Package,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  History,
  ArrowUpCircle,
  ArrowDownCircle,
  Shield,
  Lock,
  Layers,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import ProductForm from "./ProductForm";

interface StockMovement {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string | null;
  notes: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
  created_by: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  additional_images: string[] | null;
  rating: number;
  reviews: number;
  badges: string[];
  category: string | null;
  category_id: string | null;
  is_active: boolean;
  is_sealed: boolean;
  sort_order: number;
  stock_quantity: number;
  low_stock_threshold: number;
  reserved_stock: number;
  variations_count?: number;
}

const getStockStatus = (product: Product) => {
  if (product.stock_quantity === 0) {
    return { label: "Esgotado", variant: "destructive" as const, isLow: true };
  }
  if (product.stock_quantity <= product.low_stock_threshold) {
    return { label: "Baixo estoque", variant: "warning" as const, isLow: true };
  }
  return { label: "Em estoque", variant: "secondary" as const, isLow: false };
};

const ProductsManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<{
    data: Record<string, unknown>;
    valid: boolean;
    errors: string[];
  }>>([]);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  
  // Stock history and reserve dialogs
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isReserveDialogOpen, setIsReserveDialogOpen] = useState(false);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [reserveQuantity, setReserveQuantity] = useState("");
  const [reserveNotes, setReserveNotes] = useState("");
  const [isReserving, setIsReserving] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);

  const lowStockProducts = products.filter(
    (p) => p.stock_quantity <= p.low_stock_threshold
  );

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;

      // Fetch variations count for each product
      const productsWithVariations = await Promise.all(
        (data || []).map(async (product) => {
          const { count } = await supabase
            .from("product_variations")
            .select("*", { count: "exact", head: true })
            .eq("product_id", product.id);

          return { ...product, variations_count: count || 0 };
        })
      );

      setProducts(productsWithVariations);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreateDialog = () => {
    setSelectedProduct(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;

    try {
      // Delete variations first
      await supabase
        .from("product_variations")
        .delete()
        .eq("product_id", selectedProduct.id);

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", selectedProduct.id);

      if (error) throw error;

      toast.success("Produto excluído com sucesso!");
      setIsDeleteDialogOpen(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Erro ao excluir produto");
    }
  };

  const confirmDelete = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const toggleProductActive = async (product: Product) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: !product.is_active })
        .eq("id", product.id);

      if (error) throw error;
      
      toast.success(
        product.is_active ? "Produto desativado" : "Produto ativado"
      );
      fetchProducts();
    } catch (error) {
      console.error("Error toggling product:", error);
      toast.error("Erro ao alterar status do produto");
    }
  };

  // Stock History functions
  const openHistoryDialog = async (product: Product) => {
    setSelectedProductForHistory(product);
    setIsHistoryDialogOpen(true);
    setIsLoadingHistory(true);

    try {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setStockMovements(data || []);
    } catch (error) {
      console.error("Error fetching stock history:", error);
      toast.error("Erro ao carregar histórico de estoque");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const openReserveDialog = (product: Product) => {
    setSelectedProductForHistory(product);
    setReserveQuantity("");
    setReserveNotes("");
    setIsReserveDialogOpen(true);
  };

  const handleReserveStock = async () => {
    if (!selectedProductForHistory) return;
    
    const quantity = parseInt(reserveQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Quantidade inválida");
      return;
    }

    const availableStock = selectedProductForHistory.stock_quantity - selectedProductForHistory.reserved_stock;
    if (quantity > availableStock) {
      toast.error(`Máximo disponível para reserva: ${availableStock}`);
      return;
    }

    setIsReserving(true);
    try {
      const newReserved = selectedProductForHistory.reserved_stock + quantity;
      
      const { error: updateError } = await supabase
        .from("products")
        .update({ reserved_stock: newReserved })
        .eq("id", selectedProductForHistory.id);

      if (updateError) throw updateError;

      const { error: movementError } = await supabase
        .from("stock_movements")
        .insert({
          product_id: selectedProductForHistory.id,
          movement_type: "reservation",
          quantity: quantity,
          previous_quantity: selectedProductForHistory.reserved_stock,
          new_quantity: newReserved,
          reason: "Reserva de segurança",
          notes: reserveNotes || null,
          reference_type: "security_reserve",
        });

      if (movementError) throw movementError;

      toast.success(`${quantity} unidades reservadas com sucesso!`);
      setIsReserveDialogOpen(false);
      fetchProducts();
    } catch (error) {
      console.error("Error reserving stock:", error);
      toast.error("Erro ao reservar estoque");
    } finally {
      setIsReserving(false);
    }
  };

  const handleReleaseReserve = async (product: Product, quantity: number) => {
    if (quantity > product.reserved_stock) {
      toast.error("Quantidade maior que o reservado");
      return;
    }

    try {
      const newReserved = product.reserved_stock - quantity;
      
      const { error: updateError } = await supabase
        .from("products")
        .update({ reserved_stock: newReserved })
        .eq("id", product.id);

      if (updateError) throw updateError;

      const { error: movementError } = await supabase
        .from("stock_movements")
        .insert({
          product_id: product.id,
          movement_type: "release",
          quantity: quantity,
          previous_quantity: product.reserved_stock,
          new_quantity: newReserved,
          reason: "Liberação de reserva",
          reference_type: "security_reserve",
        });

      if (movementError) throw movementError;

      toast.success(`${quantity} unidades liberadas da reserva!`);
      fetchProducts();
    } catch (error) {
      console.error("Error releasing reserve:", error);
      toast.error("Erro ao liberar reserva");
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "entry":
        return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
      case "exit":
        return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
      case "reservation":
        return <Lock className="h-4 w-4 text-orange-600" />;
      case "release":
        return <Shield className="h-4 w-4 text-blue-600" />;
      default:
        return <Package className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case "entry":
        return "Entrada";
      case "exit":
        return "Saída";
      case "reservation":
        return "Reserva";
      case "release":
        return "Liberação";
      case "adjustment":
        return "Ajuste";
      default:
        return type;
    }
  };

  // Import functionality
  const downloadTemplate = () => {
    const template = [
      {
        nome: "Exemplo Produto",
        descricao: "Descrição do produto",
        preco: 29.90,
        preco_original: 39.90,
        categoria: "Ervas",
        badges: "Orgânico, Vegano",
        estoque: 50,
        limite_estoque_baixo: 5,
        ativo: "sim",
        imagem_url: "https://exemplo.com/imagem.jpg",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    
    ws["!cols"] = [
      { wch: 25 },
      { wch: 40 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 10 },
      { wch: 20 },
      { wch: 8 },
      { wch: 40 },
    ];

    XLSX.writeFile(wb, "modelo_produtos.xlsx");
    toast.success("Modelo baixado com sucesso!");
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error("O arquivo está vazio");
        return;
      }

      const preview = jsonData.map((row: unknown) => {
        const r = row as Record<string, unknown>;
        const errors: string[] = [];

        if (!r.nome && !r.name) {
          errors.push("Nome é obrigatório");
        }
        if (!r.preco && !r.price && r.preco !== 0 && r.price !== 0) {
          errors.push("Preço é obrigatório");
        }

        return {
          data: r,
          valid: errors.length === 0,
          errors,
        };
      });

      setImportPreview(preview);
      setIsImportDialogOpen(true);
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("Erro ao ler o arquivo");
    }

    if (importFileInputRef.current) {
      importFileInputRef.current.value = "";
    }
  };

  const executeImport = async () => {
    const validItems = importPreview.filter((item) => item.valid);
    if (validItems.length === 0) {
      toast.error("Nenhum produto válido para importar");
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const item of validItems) {
      try {
        const r = item.data;
        
        const productData = {
          name: String(r.nome || r.name || ""),
          description: String(r.descricao || r.description || "") || null,
          price: parseFloat(String(r.preco || r.price || 0)),
          original_price: r.preco_original || r.original_price 
            ? parseFloat(String(r.preco_original || r.original_price)) 
            : null,
          category: String(r.categoria || r.category || "") || null,
          badges: r.badges 
            ? String(r.badges).split(",").map((b: string) => b.trim()).filter(Boolean)
            : [],
          stock_quantity: parseInt(String(r.estoque || r.stock || r.stock_quantity || 0)),
          low_stock_threshold: parseInt(String(r.limite_estoque_baixo || r.low_stock_threshold || 5)),
          is_active: String(r.ativo || r.active || r.is_active || "sim").toLowerCase() !== "nao" 
            && String(r.ativo || r.active || r.is_active || "sim").toLowerCase() !== "não"
            && String(r.ativo || r.active || r.is_active || "sim").toLowerCase() !== "false"
            && String(r.ativo || r.active || r.is_active || "sim").toLowerCase() !== "0",
          image_url: String(r.imagem_url || r.image_url || "") || null,
          rating: parseFloat(String(r.avaliacao || r.rating || 5)),
          reviews: parseInt(String(r.avaliacoes || r.reviews || 0)),
          sort_order: products.length + successCount,
        };

        const { error } = await supabase.from("products").insert(productData);

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error("Error importing product:", error);
        errorCount++;
      }
    }

    setIsImporting(false);
    setIsImportDialogOpen(false);
    setImportPreview([]);
    fetchProducts();

    if (successCount > 0) {
      toast.success(`${successCount} produto(s) importado(s) com sucesso!`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} produto(s) falharam ao importar`);
    }
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
      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800 dark:text-orange-400">Alerta de Estoque Baixo</AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-300">
            {lowStockProducts.length} produto(s) com estoque baixo ou esgotado:{" "}
            {lowStockProducts.map((p) => p.name).join(", ")}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Gerenciamento de Produtos
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={fetchProducts}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Modelo
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => importFileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Importar Excel/CSV
            </Button>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Imagem</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Variações</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead className="text-right w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum produto cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => {
                    const stockStatus = getStockStatus(product);
                    return (
                      <TableRow key={product.id} className={stockStatus.isLow ? "bg-orange-50/50 dark:bg-orange-950/10" : ""}>
                        <TableCell>
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-md"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {product.name}
                              {product.is_sealed && (
                                <Lock className="h-3 w-3 text-amber-600" />
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {product.description}
                            </p>
                            <div className="flex gap-1 mt-1">
                              {product.badges?.slice(0, 2).map((badge, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {badge}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{product.category || "-"}</TableCell>
                        <TableCell className="text-center">
                          {(product.variations_count || 0) > 0 ? (
                            <Badge variant="outline" className="gap-1">
                              <Layers className="h-3 w-3" />
                              {product.variations_count}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <span className="font-medium">
                              R$ {Number(product.price).toFixed(2).replace(".", ",")}
                            </span>
                            {product.original_price && (
                              <p className="text-xs text-muted-foreground line-through">
                                R$ {Number(product.original_price).toFixed(2).replace(".", ",")}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Badge 
                              variant={stockStatus.variant === "warning" ? "outline" : stockStatus.variant}
                              className={stockStatus.variant === "warning" ? "border-orange-500 text-orange-600 bg-orange-50" : ""}
                            >
                              <Package className="h-3 w-3 mr-1" />
                              {product.stock_quantity - (product.reserved_stock || 0)}
                            </Badge>
                            {(product.reserved_stock || 0) > 0 && (
                              <Badge variant="outline" className="border-orange-400 text-orange-600 text-xs">
                                <Lock className="h-2 w-2 mr-1" />
                                {product.reserved_stock} reservado
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {stockStatus.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={product.is_active}
                            onCheckedChange={() => toggleProductActive(product)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openHistoryDialog(product)}
                              title="Histórico de movimentações"
                            >
                              <History className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openReserveDialog(product)}
                              title="Reservar estoque"
                            >
                              <Shield className="h-4 w-4 text-orange-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(product)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDelete(product)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct 
                ? "Edite as informações, fotos e variações do produto"
                : "Adicione informações, fotos e variações em um único lugar"
              }
            </DialogDescription>
          </DialogHeader>

          <ProductForm
            productId={selectedProduct?.id}
            initialData={selectedProduct ? {
              name: selectedProduct.name,
              description: selectedProduct.description || "",
              price: String(selectedProduct.price),
              original_price: selectedProduct.original_price ? String(selectedProduct.original_price) : "",
              image_url: selectedProduct.image_url || "",
              additional_images: selectedProduct.additional_images || [],
              rating: String(selectedProduct.rating),
              reviews: String(selectedProduct.reviews),
              badges: selectedProduct.badges?.join(", ") || "",
              category: selectedProduct.category || "",
              category_id: selectedProduct.category_id || "",
              is_active: selectedProduct.is_active,
              is_sealed: selectedProduct.is_sealed || false,
              sort_order: String(selectedProduct.sort_order),
              stock_quantity: String(selectedProduct.stock_quantity),
              low_stock_threshold: String(selectedProduct.low_stock_threshold),
            } : undefined}
            onSave={() => {
              setIsDialogOpen(false);
              fetchProducts();
            }}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Tem certeza que deseja excluir o produto{" "}
            <strong>{selectedProduct?.name}</strong>? Esta ação não pode ser
            desfeita e todas as variações serão removidas.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Produtos em Massa
            </DialogTitle>
            <DialogDescription>
              Revise os dados antes de importar. Produtos com erros serão ignorados.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>{importPreview.filter(p => p.valid).length} válidos</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span>{importPreview.filter(p => !p.valid).length} com erros</span>
            </div>
          </div>

          <ScrollArea className="flex-1 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Status</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead>Erros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importPreview.map((item, index) => {
                  const r = item.data;
                  return (
                    <TableRow 
                      key={index}
                      className={!item.valid ? "bg-red-50 dark:bg-red-950/20" : ""}
                    >
                      <TableCell>
                        {item.valid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {String(r.nome || r.name || "-")}
                      </TableCell>
                      <TableCell>
                        {String(r.categoria || r.category || "-")}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {parseFloat(String(r.preco || r.price || 0)).toFixed(2).replace(".", ",")}
                      </TableCell>
                      <TableCell className="text-center">
                        {String(r.estoque || r.stock || r.stock_quantity || 0)}
                      </TableCell>
                      <TableCell>
                        {item.errors.length > 0 && (
                          <span className="text-red-600 text-xs">
                            {item.errors.join(", ")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportPreview([]);
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={executeImport} 
              disabled={isImporting || importPreview.filter(p => p.valid).length === 0}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {importPreview.filter(p => p.valid).length} Produto(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Estoque - {selectedProductForHistory?.name}
            </DialogTitle>
            <DialogDescription>
              Movimentações de entrada, saída e reserva do produto
            </DialogDescription>
          </DialogHeader>

          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : stockMovements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma movimentação registrada</p>
            </div>
          ) : (
            <ScrollArea className="flex-1 max-h-[400px]">
              <div className="space-y-3 pr-4">
                {stockMovements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="mt-1">
                      {getMovementIcon(movement.movement_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">
                          {getMovementLabel(movement.movement_type)}
                        </span>
                        <Badge 
                          variant={movement.movement_type === "entry" || movement.movement_type === "release" ? "default" : "secondary"}
                          className={movement.movement_type === "entry" ? "bg-green-600" : movement.movement_type === "exit" ? "bg-red-600" : ""}
                        >
                          {movement.movement_type === "entry" || movement.movement_type === "release" ? "+" : "-"}{movement.quantity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {movement.previous_quantity} → {movement.new_quantity} unidades
                      </p>
                      {movement.reason && (
                        <p className="text-sm mt-1">{movement.reason}</p>
                      )}
                      {movement.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          {movement.notes}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(movement.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reserve Stock Dialog */}
      <Dialog open={isReserveDialogOpen} onOpenChange={setIsReserveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-600" />
              Reservar Estoque de Segurança
            </DialogTitle>
            <DialogDescription>
              {selectedProductForHistory?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedProductForHistory && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {selectedProductForHistory.stock_quantity - (selectedProductForHistory.reserved_stock || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Disponível</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">
                    {selectedProductForHistory.reserved_stock || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Reservado</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {selectedProductForHistory.stock_quantity}
                  </p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>

              {(selectedProductForHistory.reserved_stock || 0) > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleReleaseReserve(selectedProductForHistory, selectedProductForHistory.reserved_stock || 0)}
                  >
                    Liberar Tudo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleReleaseReserve(selectedProductForHistory, 1)}
                  >
                    Liberar 1
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reserve-quantity">Quantidade para Reservar</Label>
                <Input
                  id="reserve-quantity"
                  type="number"
                  min="1"
                  max={selectedProductForHistory.stock_quantity - (selectedProductForHistory.reserved_stock || 0)}
                  value={reserveQuantity}
                  onChange={(e) => setReserveQuantity(e.target.value)}
                  placeholder="Quantidade"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reserve-notes">Observações (opcional)</Label>
                <Input
                  id="reserve-notes"
                  value={reserveNotes}
                  onChange={(e) => setReserveNotes(e.target.value)}
                  placeholder="Motivo da reserva"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReserveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReserveStock} disabled={isReserving}>
              {isReserving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reservar Estoque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsManager;
