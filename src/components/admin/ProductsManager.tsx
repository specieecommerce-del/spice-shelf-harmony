import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  X,
  RefreshCw,
  AlertTriangle,
  Package,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as XLSX from "xlsx";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  rating: number;
  reviews: number;
  badges: string[];
  category: string | null;
  is_active: boolean;
  sort_order: number;
  stock_quantity: number;
  low_stock_threshold: number;
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
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<{
    data: Record<string, unknown>;
    valid: boolean;
    errors: string[];
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    original_price: "",
    image_url: "",
    rating: "5.0",
    reviews: "0",
    badges: "",
    category: "",
    is_active: true,
    sort_order: "0",
    stock_quantity: "50",
    low_stock_threshold: "5",
  });

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
      setProducts(data || []);
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
    setFormData({
      name: "",
      description: "",
      price: "",
      original_price: "",
      image_url: "",
      rating: "5.0",
      reviews: "0",
      badges: "",
      category: "",
      is_active: true,
      sort_order: String(products.length + 1),
      stock_quantity: "50",
      low_stock_threshold: "5",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      original_price: product.original_price ? String(product.original_price) : "",
      image_url: product.image_url || "",
      rating: String(product.rating),
      reviews: String(product.reviews),
      badges: product.badges?.join(", ") || "",
      category: product.category || "",
      is_active: product.is_active,
      sort_order: String(product.sort_order),
      stock_quantity: String(product.stock_quantity),
      low_stock_threshold: String(product.low_stock_threshold),
    });
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione apenas imagens");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, image_url: urlData.publicUrl }));
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("O nome do produto é obrigatório");
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error("O preço deve ser maior que zero");
      return;
    }

    setIsSaving(true);
    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        image_url: formData.image_url || null,
        rating: parseFloat(formData.rating) || 5.0,
        reviews: parseInt(formData.reviews) || 0,
        badges: formData.badges
          .split(",")
          .map((b) => b.trim())
          .filter(Boolean),
        category: formData.category.trim() || null,
        is_active: formData.is_active,
        sort_order: parseInt(formData.sort_order) || 0,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 5,
      };

      if (selectedProduct) {
        // Update existing product
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", selectedProduct.id);

        if (error) throw error;
        toast.success("Produto atualizado com sucesso!");
      } else {
        // Create new product
        const { error } = await supabase.from("products").insert(productData);

        if (error) throw error;
        toast.success("Produto criado com sucesso!");
      }

      setIsDialogOpen(false);
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Erro ao salvar produto");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;

    try {
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

  // Import functionality
  const downloadTemplate = () => {
    const template = [
      {
        nome: "Exemplo Produto",
        descricao: "Descrição do produto",
        preco: 29.90,
        preco_original: 39.90,
        categoria: "Ervas",
        badges: "Orgânico, Vegan",
        estoque: 50,
        limite_estoque_baixo: 5,
        ativo: "sim",
        imagem_url: "https://exemplo.com/imagem.jpg",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    
    // Set column widths
    ws["!cols"] = [
      { wch: 25 }, // nome
      { wch: 40 }, // descricao
      { wch: 10 }, // preco
      { wch: 15 }, // preco_original
      { wch: 15 }, // categoria
      { wch: 25 }, // badges
      { wch: 10 }, // estoque
      { wch: 20 }, // limite_estoque_baixo
      { wch: 8 },  // ativo
      { wch: 40 }, // imagem_url
    ];

    XLSX.writeFile(wb, "modelo_produtos.xlsx");
    toast.success("Modelo baixado com sucesso!");
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith(".csv") && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV");
      return;
    }

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

      // Validate and preview data
      const preview = jsonData.map((row: unknown) => {
        const r = row as Record<string, unknown>;
        const errors: string[] = [];

        // Check required fields
        if (!r.nome && !r.name) {
          errors.push("Nome é obrigatório");
        }
        if (!r.preco && !r.price && r.preco !== 0 && r.price !== 0) {
          errors.push("Preço é obrigatório");
        }

        const price = parseFloat(String(r.preco || r.price || 0));
        if (isNaN(price) || price < 0) {
          errors.push("Preço inválido");
        }

        const stock = parseInt(String(r.estoque || r.stock || r.stock_quantity || 0));
        if (isNaN(stock) || stock < 0) {
          errors.push("Estoque inválido");
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

    // Reset input
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
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead className="text-right w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                          <p className="font-medium">{product.name}</p>
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
                              {product.stock_quantity}
                            </Badge>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Imagem do Produto</Label>
              <div className="flex items-start gap-4">
                {formData.image_url ? (
                  <div className="relative">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => setFormData((prev) => ({ ...prev, image_url: "" }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">
                          Clique para enviar
                        </span>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Ou cole uma URL de imagem"
                    value={formData.image_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, image_url: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Formatos: JPG, PNG, WebP. Máximo 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ex: Mix Ervas Provence"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Descrição do produto..."
                rows={3}
              />
            </div>

            {/* Price Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, price: e.target.value }))
                  }
                  placeholder="34.90"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="original_price">Preço Original (R$)</Label>
                <Input
                  id="original_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.original_price}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, original_price: e.target.value }))
                  }
                  placeholder="44.90 (deixe vazio se não houver)"
                />
              </div>
            </div>

            {/* Category and Badges */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, category: e.target.value }))
                  }
                  placeholder="Ex: Ervas, Sais, Kits"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="badges">Badges (separados por vírgula)</Label>
                <Input
                  id="badges"
                  value={formData.badges}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, badges: e.target.value }))
                  }
                  placeholder="Best-seller, Orgânico, Vegan"
                />
              </div>
            </div>

            {/* Stock Management */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Gerenciamento de Estoque
              </Label>
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Quantidade em Estoque *</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, stock_quantity: e.target.value }))
                    }
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="low_stock_threshold">Alerta de Estoque Baixo</Label>
                  <Input
                    id="low_stock_threshold"
                    type="number"
                    min="0"
                    value={formData.low_stock_threshold}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, low_stock_threshold: e.target.value }))
                    }
                    placeholder="5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Alerta quando o estoque atingir este número
                  </p>
                </div>
              </div>
            </div>

            {/* Rating and Reviews */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rating">Avaliação</Label>
                <Input
                  id="rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.rating}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, rating: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviews">Nº Avaliações</Label>
                <Input
                  id="reviews"
                  type="number"
                  min="0"
                  value={formData.reviews}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, reviews: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort_order">Ordem</Label>
                <Input
                  id="sort_order"
                  type="number"
                  min="0"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, sort_order: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked }))
                }
              />
              <Label htmlFor="is_active">Produto ativo (visível na loja)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedProduct ? "Salvar Alterações" : "Criar Produto"}
            </Button>
          </DialogFooter>
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
            desfeita.
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
    </div>
  );
};

export default ProductsManager;
