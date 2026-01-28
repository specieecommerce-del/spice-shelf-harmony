import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Package,
  Lock,
  Wand2,
  FolderOpen,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InlineVariationsEditor from "./InlineVariationsEditor";
import InlinePhotosUploader from "./InlinePhotosUploader";
import { suggestCategories, AVAILABLE_CATEGORIES, type AutoCategorySuggestion } from "@/lib/auto-categorization";

interface ProductVariation {
  id?: string;
  product_id?: string;
  name: string;
  variation_type: string;
  price_adjustment: number;
  stock_quantity: number;
  sku: string;
  is_active: boolean;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  original_price: string;
  image_url: string;
  additional_images: string[];
  rating: string;
  reviews: string;
  badges: string;
  category: string;
  category_id: string;
  is_active: boolean;
  is_sealed: boolean;
  sort_order: string;
  stock_quantity: string;
  low_stock_threshold: string;
}

interface ProductFormProps {
  productId?: string;
  initialData?: ProductFormData;
  onSave: () => void;
  onCancel: () => void;
}

const ProductForm = ({ productId, initialData, onSave, onCancel }: ProductFormProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<AutoCategorySuggestion[]>([]);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [activeTab, setActiveTab] = useState("info");

  const [formData, setFormData] = useState<ProductFormData>(
    initialData || {
      name: "",
      description: "",
      price: "",
      original_price: "",
      image_url: "",
      additional_images: [],
      rating: "5.0",
      reviews: "0",
      badges: "",
      category: "",
      category_id: "",
      is_active: true,
      is_sealed: false,
      sort_order: "0",
      stock_quantity: "50",
      low_stock_threshold: "5",
    }
  );

  useEffect(() => {
    fetchCategories();
    if (productId) {
      fetchVariations();
    }
  }, [productId]);

  // Auto-suggest categories when name/description changes
  useEffect(() => {
    if (formData.name.length > 2) {
      const suggestions = suggestCategories(
        formData.name,
        formData.description,
        formData.badges.split(",").filter(Boolean),
        variations
      );
      setCategorySuggestions(suggestions.slice(0, 3));
    } else {
      setCategorySuggestions([]);
    }
  }, [formData.name, formData.description, formData.badges, variations]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("product_categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("name");
    
    if (data) setCategories(data);
  };

  const fetchVariations = async () => {
    if (!productId) return;
    
    const { data, error } = await supabase
      .from("product_variations")
      .select("*")
      .eq("product_id", productId)
      .order("variation_type")
      .order("name");

    if (error) {
      console.error("Error fetching variations:", error);
      return;
    }

    setVariations(
      data?.map((v) => ({
        ...v,
        sku: v.sku || "",
        price_adjustment: v.price_adjustment || 0,
        stock_quantity: v.stock_quantity || 0,
      })) || []
    );
  };

  const applySuggestedCategory = (suggestion: AutoCategorySuggestion) => {
    // Find matching category from database
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === suggestion.category.toLowerCase()
    );
    
    if (matchedCategory) {
      setFormData((prev) => ({
        ...prev,
        category: matchedCategory.name,
        category_id: matchedCategory.id,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        category: suggestion.category,
        category_id: "",
      }));
    }
    toast.success(`Categoria "${suggestion.category}" aplicada`);
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
        additional_images: formData.additional_images,
        rating: parseFloat(formData.rating) || 5.0,
        reviews: parseInt(formData.reviews) || 0,
        badges: formData.badges
          .split(",")
          .map((b) => b.trim())
          .filter(Boolean),
        category: formData.category.trim() || null,
        category_id: formData.category_id || null,
        is_active: formData.is_active,
        is_sealed: formData.is_sealed,
        sort_order: parseInt(formData.sort_order) || 0,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 5,
      };

      let savedProductId = productId;

      if (productId) {
        // Update existing product
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", productId);

        if (error) throw error;
      } else {
        // Create new product
        const { data, error } = await supabase
          .from("products")
          .insert(productData)
          .select("id")
          .single();

        if (error) throw error;
        savedProductId = data.id;
      }

      // Save variations
      if (savedProductId) {
        await saveVariations(savedProductId);
      }

      toast.success(productId ? "Produto atualizado!" : "Produto criado!");
      onSave();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Erro ao salvar produto");
    } finally {
      setIsSaving(false);
    }
  };

  const saveVariations = async (prodId: string) => {
    // Delete removed variations
    const deletedVariations = variations.filter((v) => v.isDeleted && v.id);
    for (const v of deletedVariations) {
      await supabase.from("product_variations").delete().eq("id", v.id);
    }

    // Update existing variations
    const existingVariations = variations.filter((v) => v.id && !v.isDeleted && !v.isNew);
    for (const v of existingVariations) {
      await supabase
        .from("product_variations")
        .update({
          name: v.name,
          variation_type: v.variation_type,
          price_adjustment: v.price_adjustment,
          stock_quantity: v.stock_quantity,
          sku: v.sku || null,
          is_active: v.is_active,
        })
        .eq("id", v.id);
    }

    // Create new variations
    const newVariations = variations.filter((v) => v.isNew && !v.isDeleted);
    if (newVariations.length > 0) {
      await supabase.from("product_variations").insert(
        newVariations.map((v) => ({
          product_id: prodId,
          name: v.name,
          variation_type: v.variation_type,
          price_adjustment: v.price_adjustment,
          stock_quantity: v.stock_quantity,
          sku: v.sku || null,
          is_active: v.is_active,
        }))
      );
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="photos">Fotos</TabsTrigger>
          <TabsTrigger value="variations">Variações</TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[60vh] pr-4 mt-4">
          <TabsContent value="info" className="space-y-4 mt-0">
            {/* Basic Info */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Nome do produto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Descrição detalhada do produto"
                rows={3}
              />
            </div>

            {/* Category with Auto-suggestion */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Categoria
              </Label>
              
              {/* Category Suggestions */}
              {categorySuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Wand2 className="h-3 w-3" />
                    Sugestões:
                  </span>
                  {categorySuggestions.map((suggestion) => (
                    <Badge
                      key={suggestion.category}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => applySuggestedCategory(suggestion)}
                    >
                      {suggestion.category}
                      <span className="ml-1 text-[10px] opacity-70">
                        {suggestion.confidence}%
                      </span>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => {
                    const cat = categories.find((c) => c.id === value);
                    setFormData((prev) => ({
                      ...prev,
                      category_id: value,
                      category: cat?.name || "",
                    }));
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="flex-1"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, category: e.target.value }))
                  }
                  placeholder="Ou digite uma nova"
                />
              </div>
            </div>

            {/* Pricing */}
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
                  placeholder="29.90"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="original_price">Preço Original</Label>
                <Input
                  id="original_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.original_price}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, original_price: e.target.value }))
                  }
                  placeholder="44.90 (riscado)"
                />
              </div>
            </div>

            {/* Stock */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="stock" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Estoque
                </Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, stock_quantity: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="threshold">Alerta Estoque Baixo</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  value={formData.low_stock_threshold}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, low_stock_threshold: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Badges */}
            <div className="space-y-2">
              <Label htmlFor="badges">Badges (separados por vírgula)</Label>
              <Input
                id="badges"
                value={formData.badges}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, badges: e.target.value }))
                }
                placeholder="Best-seller, Orgânico, Vegano, Tampa de Bambu"
              />
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="is_active">Produto ativo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_sealed"
                  checked={formData.is_sealed}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_sealed: checked }))
                  }
                />
                <Label htmlFor="is_sealed" className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Lacrado
                </Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="photos" className="mt-0">
            <InlinePhotosUploader
              mainImage={formData.image_url}
              additionalImages={formData.additional_images}
              onMainImageChange={(url) =>
                setFormData((prev) => ({ ...prev, image_url: url }))
              }
              onAdditionalImagesChange={(urls) =>
                setFormData((prev) => ({ ...prev, additional_images: urls }))
              }
            />
          </TabsContent>

          <TabsContent value="variations" className="mt-0">
            <InlineVariationsEditor
              productId={productId}
              basePrice={parseFloat(formData.price) || 0}
              variations={variations}
              onVariationsChange={setVariations}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Footer Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {productId ? "Salvar Alterações" : "Criar Produto"}
        </Button>
      </div>
    </div>
  );
};

export default ProductForm;
