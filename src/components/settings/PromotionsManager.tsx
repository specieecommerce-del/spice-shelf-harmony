import { useState, useEffect } from "react";
import { Percent, Plus, Trash2, Loader2, Calendar, Tag, Image as ImageIcon, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Promotion {
  id: string;
  title: string;
  description: string;
  discount_percentage: number;
  banner_url: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  featured: boolean;
  created_at: string;
}

const PromotionsManager = () => {
  const { toast } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "promotions")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data?.value && Array.isArray(data.value)) {
        setPromotions(data.value as unknown as Promotion[]);
      }
    } catch (err) {
      console.error("Error loading promotions:", err);
      toast({
        title: "Erro ao carregar promoções",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savePromotions = async (newPromotions: Promotion[]) => {
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from("store_settings")
        .select("id")
        .eq("key", "promotions")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("store_settings")
          .update({
            value: JSON.parse(JSON.stringify(newPromotions)),
            updated_at: new Date().toISOString(),
          })
          .eq("key", "promotions");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("store_settings")
          .insert({
            key: "promotions",
            value: JSON.parse(JSON.stringify(newPromotions)),
          });
        if (error) throw error;
      }

      setPromotions(newPromotions);
      return true;
    } catch (err) {
      console.error("Error saving promotions:", err);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Digite um título para a promoção.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const newPromotion: Promotion = {
        id: editingId || crypto.randomUUID(),
        title: title.trim(),
        description: description.trim(),
        discount_percentage: parseFloat(discountPercentage) || 0,
        banner_url: bannerUrl.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        is_active: isActive,
        featured,
        created_at: editingId ? promotions.find(p => p.id === editingId)?.created_at || new Date().toISOString() : new Date().toISOString(),
      };

      let newPromotions: Promotion[];
      if (editingId) {
        newPromotions = promotions.map(p => p.id === editingId ? newPromotion : p);
      } else {
        newPromotions = [...promotions, newPromotion];
      }

      const success = await savePromotions(newPromotions);
      if (success) {
        toast({
          title: editingId ? "Promoção atualizada!" : "Promoção criada!",
          description: "As alterações foram salvas com sucesso.",
        });
        resetForm();
      } else {
        throw new Error("Falha ao salvar");
      }
    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a promoção.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta promoção?")) return;

    const newPromotions = promotions.filter(p => p.id !== id);
    const success = await savePromotions(newPromotions);
    
    if (success) {
      toast({
        title: "Promoção excluída",
        description: "A promoção foi removida com sucesso.",
      });
    } else {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a promoção.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingId(promotion.id);
    setTitle(promotion.title);
    setDescription(promotion.description);
    setDiscountPercentage(promotion.discount_percentage.toString());
    setBannerUrl(promotion.banner_url || "");
    setStartDate(promotion.start_date || "");
    setEndDate(promotion.end_date || "");
    setIsActive(promotion.is_active);
    setFeatured(promotion.featured);
    setShowForm(true);
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    const newPromotions = promotions.map(p => 
      p.id === id ? { ...p, is_active: !currentState } : p
    );
    const success = await savePromotions(newPromotions);
    
    if (success) {
      toast({
        title: currentState ? "Promoção desativada" : "Promoção ativada",
      });
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDiscountPercentage("");
    setBannerUrl("");
    setStartDate("");
    setEndDate("");
    setIsActive(true);
    setFeatured(false);
    setEditingId(null);
    setShowForm(false);
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
            <Percent className="h-5 w-5 text-orange-500" />
            Gerenciar Promoções
          </CardTitle>
          <CardDescription>
            Crie e gerencie promoções para exibir na loja.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!showForm ? (
            <Button onClick={() => setShowForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Nova Promoção
            </Button>
          ) : (
            <Card className="border-2 border-orange-200 bg-orange-50/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">
                  {editingId ? "Editar Promoção" : "Nova Promoção"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="promo-title">Título *</Label>
                    <Input
                      id="promo-title"
                      placeholder="Ex: Black Friday 50% OFF"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promo-discount">Desconto (%)</Label>
                    <Input
                      id="promo-discount"
                      type="number"
                      placeholder="50"
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(e.target.value)}
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="promo-desc">Descrição</Label>
                  <Textarea
                    id="promo-desc"
                    placeholder="Descreva a promoção..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="promo-banner">URL do Banner</Label>
                  <Input
                    id="promo-banner"
                    placeholder="https://..."
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="promo-start">Data Início</Label>
                    <Input
                      id="promo-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promo-end">Data Fim</Label>
                    <Input
                      id="promo-end"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                    <Label>Ativa</Label>
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
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {editingId ? "Atualizar" : "Criar"} Promoção
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de promoções */}
          <div className="space-y-3">
            {promotions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma promoção cadastrada ainda.
              </p>
            ) : (
              promotions.map((promo) => (
                <Card key={promo.id} className={!promo.is_active ? "opacity-60" : ""}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                        {promo.discount_percentage > 0 ? (
                          <span className="text-orange-600 font-bold text-sm">
                            {promo.discount_percentage}%
                          </span>
                        ) : (
                          <Tag className="h-5 w-5 text-orange-500" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          {promo.title}
                          {promo.featured && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                              Destaque
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {promo.description || "Sem descrição"}
                        </p>
                        {promo.start_date && promo.end_date && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(promo.start_date).toLocaleDateString("pt-BR")} - {new Date(promo.end_date).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(promo.id, promo.is_active)}
                      >
                        {promo.is_active ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(promo)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(promo.id)}
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

export default PromotionsManager;
