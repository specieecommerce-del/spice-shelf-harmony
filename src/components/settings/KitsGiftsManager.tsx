import { useState, useEffect } from "react";
import { Gift, Plus, Trash2, Loader2, Package, Star, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface KitGift {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  items_included: string[];
  is_gift: boolean;
  is_active: boolean;
  featured: boolean;
  created_at: string;
}

const KitsGiftsManager = () => {
  const { toast } = useToast();
  const [kitsGifts, setKitsGifts] = useState<KitGift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [itemsIncluded, setItemsIncluded] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadKitsGifts();
  }, []);

  const loadKitsGifts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "kits_gifts")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data?.value && Array.isArray(data.value)) {
        setKitsGifts(data.value as unknown as KitGift[]);
      }
    } catch (err) {
      console.error("Error loading kits/gifts:", err);
      toast({
        title: "Erro ao carregar kits e presentes",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveKitsGifts = async (newKitsGifts: KitGift[]) => {
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from("store_settings")
        .select("id")
        .eq("key", "kits_gifts")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("store_settings")
          .update({
            value: JSON.parse(JSON.stringify(newKitsGifts)),
            updated_at: new Date().toISOString(),
          })
          .eq("key", "kits_gifts");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("store_settings")
          .insert({
            key: "kits_gifts",
            value: JSON.parse(JSON.stringify(newKitsGifts)),
          });
        if (error) throw error;
      }

      setKitsGifts(newKitsGifts);
      return true;
    } catch (err) {
      console.error("Error saving kits/gifts:", err);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !price.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e preço são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const newKitGift: KitGift = {
        id: editingId || crypto.randomUUID(),
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price) || 0,
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        image_url: imageUrl.trim() || null,
        items_included: itemsIncluded.split("\n").filter(item => item.trim()),
        is_gift: isGift,
        is_active: isActive,
        featured,
        created_at: editingId ? kitsGifts.find(k => k.id === editingId)?.created_at || new Date().toISOString() : new Date().toISOString(),
      };

      let newKitsGifts: KitGift[];
      if (editingId) {
        newKitsGifts = kitsGifts.map(k => k.id === editingId ? newKitGift : k);
      } else {
        newKitsGifts = [...kitsGifts, newKitGift];
      }

      const success = await saveKitsGifts(newKitsGifts);
      if (success) {
        toast({
          title: editingId ? "Kit/Presente atualizado!" : "Kit/Presente criado!",
          description: "As alterações foram salvas com sucesso.",
        });
        resetForm();
      } else {
        throw new Error("Falha ao salvar");
      }
    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o kit/presente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este kit/presente?")) return;

    const newKitsGifts = kitsGifts.filter(k => k.id !== id);
    const success = await saveKitsGifts(newKitsGifts);
    
    if (success) {
      toast({
        title: "Kit/Presente excluído",
        description: "O item foi removido com sucesso.",
      });
    } else {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o item.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (kitGift: KitGift) => {
    setEditingId(kitGift.id);
    setName(kitGift.name);
    setDescription(kitGift.description);
    setPrice(kitGift.price.toString());
    setOriginalPrice(kitGift.original_price?.toString() || "");
    setImageUrl(kitGift.image_url || "");
    setItemsIncluded(kitGift.items_included.join("\n"));
    setIsGift(kitGift.is_gift);
    setIsActive(kitGift.is_active);
    setFeatured(kitGift.featured);
    setShowForm(true);
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    const newKitsGifts = kitsGifts.map(k => 
      k.id === id ? { ...k, is_active: !currentState } : k
    );
    const success = await saveKitsGifts(newKitsGifts);
    
    if (success) {
      toast({
        title: currentState ? "Item desativado" : "Item ativado",
      });
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setOriginalPrice("");
    setImageUrl("");
    setItemsIncluded("");
    setIsGift(false);
    setIsActive(true);
    setFeatured(false);
    setEditingId(null);
    setShowForm(false);
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-pink-500" />
            Kits e Presentes
          </CardTitle>
          <CardDescription>
            Crie kits especiais e opções de presentes para seus clientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!showForm ? (
            <Button onClick={() => setShowForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Novo Kit ou Presente
            </Button>
          ) : (
            <Card className="border-2 border-pink-200 bg-pink-50/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">
                  {editingId ? "Editar Kit/Presente" : "Novo Kit/Presente"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="kit-name">Nome *</Label>
                    <Input
                      id="kit-name"
                      placeholder="Ex: Kit Chef Iniciante"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-4 pt-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={isGift}
                        onCheckedChange={setIsGift}
                      />
                      <Label>É um Presente</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kit-desc">Descrição</Label>
                  <Textarea
                    id="kit-desc"
                    placeholder="Descreva o kit ou presente..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="kit-price">Preço (R$) *</Label>
                    <Input
                      id="kit-price"
                      type="number"
                      placeholder="99.90"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kit-original-price">Preço Original (R$)</Label>
                    <Input
                      id="kit-original-price"
                      type="number"
                      placeholder="149.90"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value)}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kit-image">URL da Imagem</Label>
                  <Input
                    id="kit-image"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kit-items">Itens Incluídos (um por linha)</Label>
                  <Textarea
                    id="kit-items"
                    placeholder="Mix Ervas Provence&#10;Flor de Sal Premium&#10;Cúrcuma Orgânica"
                    value={itemsIncluded}
                    onChange={(e) => setItemsIncluded(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                    <Label>Ativo</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={featured}
                      onCheckedChange={setFeatured}
                    />
                    <Label>Destaque na Home</Label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="flex-1 bg-pink-500 hover:bg-pink-600"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {editingId ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de kits/presentes */}
          <div className="space-y-3">
            {kitsGifts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum kit ou presente cadastrado ainda.
              </p>
            ) : (
              kitsGifts.map((item) => (
                <Card key={item.id} className={!item.is_active ? "opacity-60" : ""}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-pink-100 flex items-center justify-center">
                        {item.is_gift ? (
                          <Gift className="h-5 w-5 text-pink-500" />
                        ) : (
                          <Package className="h-5 w-5 text-pink-500" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          {item.name}
                          {item.featured && (
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          )}
                          {item.is_gift && (
                            <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded">
                              Presente
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {item.items_included.length} itens incluídos
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-semibold text-sm">{formatPrice(item.price)}</span>
                          {item.original_price && (
                            <span className="text-xs text-muted-foreground line-through">
                              {formatPrice(item.original_price)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(item.id, item.is_active)}
                      >
                        {item.is_active ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KitsGiftsManager;
