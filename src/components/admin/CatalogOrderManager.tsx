import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  GripVertical,
  Loader2,
  Save,
  RefreshCw,
  Package,
  Eye,
  EyeOff,
  Search,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  category: string | null;
  stock_quantity: number;
}

const CatalogOrderManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url, is_active, sort_order, category, stock_quantity")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
      setHasChanges(false);
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

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newProducts = [...products];
      const [draggedItem] = newProducts.splice(draggedIndex, 1);
      newProducts.splice(dragOverIndex, 0, draggedItem);

      // Update sort_order for all items
      const updatedProducts = newProducts.map((product, index) => ({
        ...product,
        sort_order: index + 1,
      }));

      setProducts(updatedProducts);
      setHasChanges(true);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveProduct = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= products.length) return;

    const newProducts = [...products];
    [newProducts[index], newProducts[newIndex]] = [newProducts[newIndex], newProducts[index]];

    const updatedProducts = newProducts.map((product, idx) => ({
      ...product,
      sort_order: idx + 1,
    }));

    setProducts(updatedProducts);
    setHasChanges(true);
  };

  const saveOrder = async () => {
    setIsSaving(true);
    try {
      const updates = products.map((product) => ({
        id: product.id,
        sort_order: product.sort_order,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("products")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast.success("Ordem salva com sucesso!");
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving order:", error);
      toast.error("Erro ao salvar ordem");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
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
          <h2 className="text-2xl font-bold">Ordenar Catálogo</h2>
          <p className="text-muted-foreground">
            Arraste e solte para definir a ordem de exibição
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchProducts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={saveOrder} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Ordem
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
          ⚠️ Você tem alterações não salvas. Clique em "Salvar Ordem" para aplicar.
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produtos ({products.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <CardDescription>
            A ordem definida aqui reflete diretamente na página inicial e listagens do site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredProducts.map((product, index) => (
              <div
                key={product.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 rounded-lg border bg-card transition-all cursor-grab active:cursor-grabbing ${
                  dragOverIndex === index ? "border-primary bg-primary/5" : ""
                } ${draggedIndex === index ? "opacity-50" : ""} ${
                  !product.is_active ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  <span className="w-8 text-center text-sm font-mono text-muted-foreground">
                    #{product.sort_order}
                  </span>
                </div>

                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {product.category && (
                      <Badge variant="secondary" className="text-xs">
                        {product.category}
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      R$ {product.price.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      • {product.stock_quantity} em estoque
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {product.is_active ? (
                    <Eye className="h-4 w-4 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}

                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveProduct(index, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveProduct(index, "down")}
                      disabled={index === products.length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum produto encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CatalogOrderManager;
