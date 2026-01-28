import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Loader2,
  Package,
  Palette,
  Scale,
  Tag,
  Layers,
  Droplets,
  Box,
  Ruler,
  Beaker,
  Leaf,
  Settings,
  GripVertical,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

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

// Extended variation types
const VARIATION_TYPES = [
  { value: "flavor", label: "Sabor", icon: Tag },
  { value: "size", label: "Tamanho", icon: Scale },
  { value: "weight", label: "Peso", icon: Package },
  { value: "color", label: "Cor", icon: Palette },
  { value: "quantity", label: "Quantidade", icon: Layers },
  { value: "model", label: "Modelo", icon: Box },
  { value: "version", label: "Versão", icon: Settings },
  { value: "type", label: "Tipo", icon: Beaker },
  { value: "packaging", label: "Embalagem", icon: Box },
  { value: "material", label: "Material", icon: Layers },
  { value: "cap", label: "Tampa", icon: Droplets },
  { value: "composition", label: "Composição", icon: Beaker },
  { value: "dietary", label: "Restrições Alimentares", icon: Leaf },
  { value: "dimension", label: "Dimensão", icon: Ruler },
  { value: "other", label: "Outro", icon: Layers },
];

interface InlineVariationsEditorProps {
  productId?: string;
  basePrice: number;
  variations: ProductVariation[];
  onVariationsChange: (variations: ProductVariation[]) => void;
  disabled?: boolean;
}

const InlineVariationsEditor = ({
  productId,
  basePrice,
  variations,
  onVariationsChange,
  disabled = false,
}: InlineVariationsEditorProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newVariation, setNewVariation] = useState<ProductVariation>({
    name: "",
    variation_type: "flavor",
    price_adjustment: 0,
    stock_quantity: 0,
    sku: "",
    is_active: true,
    isNew: true,
  });

  const getTypeIcon = (type: string) => {
    const found = VARIATION_TYPES.find((t) => t.value === type);
    if (!found) return Layers;
    return found.icon;
  };

  const getTypeLabel = (type: string) => {
    const found = VARIATION_TYPES.find((t) => t.value === type);
    return found?.label || type;
  };

  const addVariation = () => {
    if (!newVariation.name.trim()) {
      toast.error("Nome da variação é obrigatório");
      return;
    }

    const variation: ProductVariation = {
      ...newVariation,
      product_id: productId,
      isNew: true,
    };

    onVariationsChange([...variations, variation]);

    // Reset form
    setNewVariation({
      name: "",
      variation_type: "flavor",
      price_adjustment: 0,
      stock_quantity: 0,
      sku: "",
      is_active: true,
      isNew: true,
    });
    setIsAdding(false);
    toast.success("Variação adicionada");
  };

  const removeVariation = (index: number) => {
    const variation = variations[index];
    if (variation.id) {
      // Mark existing variation for deletion
      const updated = [...variations];
      updated[index] = { ...variation, isDeleted: true };
      onVariationsChange(updated);
    } else {
      // Remove new variation
      onVariationsChange(variations.filter((_, i) => i !== index));
    }
  };

  const updateVariation = (index: number, field: keyof ProductVariation, value: unknown) => {
    const updated = [...variations];
    updated[index] = { ...updated[index], [field]: value };
    onVariationsChange(updated);
  };

  // Group variations by type
  const activeVariations = variations.filter((v) => !v.isDeleted);
  const groupedVariations = activeVariations.reduce((acc, v, originalIndex) => {
    if (!acc[v.variation_type]) {
      acc[v.variation_type] = [];
    }
    acc[v.variation_type].push({ ...v, originalIndex: variations.indexOf(v) });
    return acc;
  }, {} as Record<string, (ProductVariation & { originalIndex: number })[]>);

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Variações do Produto
          </CardTitle>
          {!isAdding && !disabled && (
            <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Variação
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Adicione variações como sabor, tamanho, cor, peso, embalagem, etc.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Variation Form */}
        {isAdding && (
          <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo de Variação</Label>
                <Select
                  value={newVariation.variation_type}
                  onValueChange={(value) =>
                    setNewVariation((prev) => ({ ...prev, variation_type: value }))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIATION_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-3 w-3" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Nome *</Label>
                <Input
                  className="h-9"
                  value={newVariation.name}
                  onChange={(e) =>
                    setNewVariation((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex: Chocolate, 900g, Azul..."
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Ajuste Preço (R$)</Label>
                <Input
                  className="h-9"
                  type="number"
                  step="0.01"
                  value={newVariation.price_adjustment}
                  onChange={(e) =>
                    setNewVariation((prev) => ({
                      ...prev,
                      price_adjustment: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-xs">Estoque</Label>
                <Input
                  className="h-9"
                  type="number"
                  value={newVariation.stock_quantity}
                  onChange={(e) =>
                    setNewVariation((prev) => ({
                      ...prev,
                      stock_quantity: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs">SKU</Label>
                <Input
                  className="h-9"
                  value={newVariation.sku}
                  onChange={(e) =>
                    setNewVariation((prev) => ({ ...prev, sku: e.target.value }))
                  }
                  placeholder="SKU-001"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newVariation.is_active}
                  onCheckedChange={(checked) =>
                    setNewVariation((prev) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label className="text-xs">Ativa</Label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={addVariation}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Variations List */}
        {Object.keys(groupedVariations).length === 0 && !isAdding ? (
          <div className="text-center py-6 text-muted-foreground">
            <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma variação adicionada</p>
            <p className="text-xs">Clique em "Nova Variação" para começar</p>
          </div>
        ) : (
          Object.entries(groupedVariations).map(([type, typeVariations]) => {
            const TypeIcon = getTypeIcon(type);
            return (
              <div key={type} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <TypeIcon className="h-4 w-4 text-primary" />
                  {getTypeLabel(type)}
                  <Badge variant="secondary" className="text-xs">
                    {typeVariations.length}
                  </Badge>
                </div>
                <div className="space-y-2 pl-6">
                  {typeVariations.map((variation) => (
                    <div
                      key={variation.originalIndex}
                      className={`flex items-center gap-3 p-2 rounded border bg-card ${
                        !variation.is_active ? "opacity-50" : ""
                      }`}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      
                      <div className="flex-1 grid grid-cols-4 gap-2 items-center">
                        <Input
                          className="h-8 text-sm"
                          value={variation.name}
                          onChange={(e) =>
                            updateVariation(variation.originalIndex, "name", e.target.value)
                          }
                          disabled={disabled}
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">R$</span>
                          <Input
                            className="h-8 text-sm w-20"
                            type="number"
                            step="0.01"
                            value={variation.price_adjustment}
                            onChange={(e) =>
                              updateVariation(
                                variation.originalIndex,
                                "price_adjustment",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            disabled={disabled}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          <Input
                            className="h-8 text-sm w-16"
                            type="number"
                            value={variation.stock_quantity}
                            onChange={(e) =>
                              updateVariation(
                                variation.originalIndex,
                                "stock_quantity",
                                parseInt(e.target.value) || 0
                              )
                            }
                            disabled={disabled}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={variation.price_adjustment >= 0 ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            R$ {(basePrice + variation.price_adjustment).toFixed(2)}
                          </Badge>
                          <Switch
                            checked={variation.is_active}
                            onCheckedChange={(checked) =>
                              updateVariation(variation.originalIndex, "is_active", checked)
                            }
                            disabled={disabled}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeVariation(variation.originalIndex)}
                            disabled={disabled}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}

        {/* Summary */}
        {activeVariations.length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              {activeVariations.length} variação(ões) • Preços de R${" "}
              {Math.min(...activeVariations.map((v) => basePrice + v.price_adjustment)).toFixed(2)} a R${" "}
              {Math.max(...activeVariations.map((v) => basePrice + v.price_adjustment)).toFixed(2)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InlineVariationsEditor;
