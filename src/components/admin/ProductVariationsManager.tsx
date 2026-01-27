import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Package,
  Palette,
  Scale,
  Tag,
  Layers,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface ProductVariation {
  id: string;
  product_id: string;
  name: string;
  variation_type: string;
  price_adjustment: number;
  stock_quantity: number;
  sku: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const VARIATION_TYPES = [
  { value: "flavor", label: "Sabor", icon: Tag },
  { value: "size", label: "Tamanho", icon: Scale },
  { value: "weight", label: "Peso", icon: Package },
  { value: "color", label: "Cor", icon: Palette },
  { value: "other", label: "Outro", icon: Layers },
];

interface ProductVariationsManagerProps {
  productId?: string;
  onBack?: () => void;
}

const ProductVariationsManager = ({ productId, onBack }: ProductVariationsManagerProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(productId || null);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    variation_type: "size",
    price_adjustment: "0",
    stock_quantity: "0",
    sku: "",
    is_active: true,
  });

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Erro ao carregar produtos");
    }
  };

  const fetchVariations = async () => {
    if (!selectedProductId) {
      setVariations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_variations")
        .select("*")
        .eq("product_id", selectedProductId)
        .order("variation_type")
        .order("name");

      if (error) throw error;
      setVariations(data || []);
    } catch (error) {
      console.error("Error fetching variations:", error);
      toast.error("Erro ao carregar variações");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchVariations();
  }, [selectedProductId]);

  const openCreateDialog = () => {
    setSelectedVariation(null);
    setFormData({
      name: "",
      variation_type: "size",
      price_adjustment: "0",
      stock_quantity: "0",
      sku: "",
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (variation: ProductVariation) => {
    setSelectedVariation(variation);
    setFormData({
      name: variation.name,
      variation_type: variation.variation_type,
      price_adjustment: String(variation.price_adjustment || 0),
      stock_quantity: String(variation.stock_quantity || 0),
      sku: variation.sku || "",
      is_active: variation.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("O nome da variação é obrigatório");
      return;
    }

    if (!selectedProductId) {
      toast.error("Selecione um produto primeiro");
      return;
    }

    setIsSaving(true);
    try {
      const variationData = {
        product_id: selectedProductId,
        name: formData.name.trim(),
        variation_type: formData.variation_type,
        price_adjustment: parseFloat(formData.price_adjustment) || 0,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        sku: formData.sku.trim() || null,
        is_active: formData.is_active,
      };

      if (selectedVariation) {
        const { error } = await supabase
          .from("product_variations")
          .update(variationData)
          .eq("id", selectedVariation.id);

        if (error) throw error;
        toast.success("Variação atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("product_variations")
          .insert(variationData);

        if (error) throw error;
        toast.success("Variação criada com sucesso!");
      }

      setIsDialogOpen(false);
      fetchVariations();
    } catch (error) {
      console.error("Error saving variation:", error);
      toast.error("Erro ao salvar variação");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedVariation) return;

    try {
      const { error } = await supabase
        .from("product_variations")
        .delete()
        .eq("id", selectedVariation.id);

      if (error) throw error;

      toast.success("Variação excluída com sucesso!");
      setIsDeleteDialogOpen(false);
      setSelectedVariation(null);
      fetchVariations();
    } catch (error) {
      console.error("Error deleting variation:", error);
      toast.error("Erro ao excluir variação");
    }
  };

  const toggleVariationActive = async (variation: ProductVariation) => {
    try {
      const { error } = await supabase
        .from("product_variations")
        .update({ is_active: !variation.is_active })
        .eq("id", variation.id);

      if (error) throw error;

      toast.success(variation.is_active ? "Variação desativada" : "Variação ativada");
      fetchVariations();
    } catch (error) {
      console.error("Error toggling variation:", error);
      toast.error("Erro ao alterar status");
    }
  };

  const getTypeIcon = (type: string) => {
    const found = VARIATION_TYPES.find((t) => t.value === type);
    if (!found) return Layers;
    return found.icon;
  };

  const getTypeLabel = (type: string) => {
    const found = VARIATION_TYPES.find((t) => t.value === type);
    return found?.label || type;
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Group variations by type
  const groupedVariations = variations.reduce((acc, v) => {
    if (!acc[v.variation_type]) {
      acc[v.variation_type] = [];
    }
    acc[v.variation_type].push(v);
    return acc;
  }, {} as Record<string, ProductVariation[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold">Variações de Produtos</h2>
            <p className="text-muted-foreground">
              Gerencie sabores, tamanhos, cores e outras variações
            </p>
          </div>
        </div>
      </div>

      {/* Product Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selecione o Produto</CardTitle>
          <CardDescription>
            Escolha um produto para gerenciar suas variações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Produto</Label>
              <Select
                value={selectedProductId || ""}
                onValueChange={(value) => setSelectedProductId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt=""
                            className="w-6 h-6 rounded object-cover"
                          />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{product.name}</span>
                        <span className="text-muted-foreground">
                          (R$ {product.price.toFixed(2)})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProductId && (
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Variação
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Variations Display */}
      {selectedProductId && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : variations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Layers className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma variação cadastrada</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Adicione variações como sabores, tamanhos ou cores para este produto.
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Variação
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedVariations).map(([type, typeVariations]) => {
                const TypeIcon = getTypeIcon(type);
                return (
                  <Card key={type}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{getTypeLabel(type)}</CardTitle>
                        <Badge variant="secondary">{typeVariations.length}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Ajuste de Preço</TableHead>
                            <TableHead>Estoque</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {typeVariations.map((variation) => (
                            <TableRow key={variation.id}>
                              <TableCell className="font-medium">{variation.name}</TableCell>
                              <TableCell>
                                {variation.price_adjustment > 0 ? (
                                  <span className="text-green-600">
                                    +R$ {variation.price_adjustment.toFixed(2)}
                                  </span>
                                ) : variation.price_adjustment < 0 ? (
                                  <span className="text-red-600">
                                    -R$ {Math.abs(variation.price_adjustment).toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Sem ajuste</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    variation.stock_quantity === 0
                                      ? "destructive"
                                      : "secondary"
                                  }
                                  className={variation.stock_quantity > 0 && variation.stock_quantity <= 5 ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                                >
                                  {variation.stock_quantity}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {variation.sku || (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={variation.is_active}
                                    onCheckedChange={() => toggleVariationActive(variation)}
                                  />
                                  {variation.is_active ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditDialog(variation)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => {
                                      setSelectedVariation(variation);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Price Preview */}
          {selectedProduct && variations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Prévia de Preços</CardTitle>
                <CardDescription>
                  Preço base: R$ {selectedProduct.price.toFixed(2)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {variations
                    .filter((v) => v.is_active)
                    .map((variation) => {
                      const finalPrice = selectedProduct.price + (variation.price_adjustment || 0);
                      return (
                        <div
                          key={variation.id}
                          className="p-3 rounded-lg border bg-muted/50"
                        >
                          <div className="text-sm text-muted-foreground">
                            {getTypeLabel(variation.variation_type)}
                          </div>
                          <div className="font-medium">{variation.name}</div>
                          <div className="text-lg font-bold text-primary">
                            R$ {finalPrice.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedVariation ? "Editar Variação" : "Nova Variação"}
            </DialogTitle>
            <DialogDescription>
              {selectedVariation
                ? "Atualize os dados da variação"
                : "Adicione uma nova variação ao produto"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tipo de Variação</Label>
              <Select
                value={formData.variation_type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, variation_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VARIATION_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nome da Variação *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ex: Chocolate, 900g, Azul..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ajuste de Preço (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price_adjustment}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, price_adjustment: e.target.value }))
                  }
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Valor positivo adiciona, negativo desconta
                </p>
              </div>

              <div>
                <Label>Estoque</Label>
                <Input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, stock_quantity: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label>SKU (opcional)</Label>
              <Input
                value={formData.sku}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sku: e.target.value }))
                }
                placeholder="Ex: WHEY-CHOC-900"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Variação Ativa</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedVariation ? "Salvar Alterações" : "Criar Variação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a variação "{selectedVariation?.name}"? Esta ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir Variação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductVariationsManager;
