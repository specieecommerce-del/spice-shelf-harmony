import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Percent, DollarSign, Image } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  is_featured: boolean;
  banner_image_url: string | null;
  product_ids: string[];
}

const PromotionsManager = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: 0,
    start_date: "",
    end_date: "",
    is_active: true,
    is_featured: false,
    banner_image_url: "",
    product_ids: [] as string[],
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [promotionsRes, productsRes] = await Promise.all([
        supabase.from("promotions").select("*").order("created_at", { ascending: false }),
        supabase.from("products").select("id, name, price, image_url").eq("is_active", true),
      ]);

      if (promotionsRes.error) throw promotionsRes.error;
      if (productsRes.error) throw productsRes.error;

      setPromotions(promotionsRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateDialog = () => {
    setEditingPromotion(null);
    setFormData({
      name: "",
      description: "",
      discount_type: "percentage",
      discount_value: 0,
      start_date: "",
      end_date: "",
      is_active: true,
      is_featured: false,
      banner_image_url: "",
      product_ids: [],
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name,
      description: promotion.description || "",
      discount_type: promotion.discount_type as "percentage" | "fixed",
      discount_value: promotion.discount_value,
      start_date: promotion.start_date ? promotion.start_date.split("T")[0] : "",
      end_date: promotion.end_date ? promotion.end_date.split("T")[0] : "",
      is_active: promotion.is_active,
      is_featured: promotion.is_featured,
      banner_image_url: promotion.banner_image_url || "",
      product_ids: promotion.product_ids || [],
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Nome é obrigatório");
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        name: formData.name,
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        banner_image_url: formData.banner_image_url || null,
        product_ids: formData.product_ids,
      };

      if (editingPromotion) {
        const { error } = await supabase
          .from("promotions")
          .update(data)
          .eq("id", editingPromotion.id);
        if (error) throw error;
        toast.success("Promoção atualizada!");
      } else {
        const { error } = await supabase.from("promotions").insert(data);
        if (error) throw error;
        toast.success("Promoção criada!");
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving promotion:", error);
      toast.error("Erro ao salvar promoção");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta promoção?")) return;

    try {
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Promoção excluída!");
      fetchData();
    } catch (error) {
      console.error("Error deleting promotion:", error);
      toast.error("Erro ao excluir promoção");
    }
  };

  const toggleActive = async (promotion: Promotion) => {
    try {
      const { error } = await supabase
        .from("promotions")
        .update({ is_active: !promotion.is_active })
        .eq("id", promotion.id);
      if (error) throw error;
      toast.success(promotion.is_active ? "Promoção desativada" : "Promoção ativada");
      fetchData();
    } catch (error) {
      console.error("Error toggling promotion:", error);
      toast.error("Erro ao alterar status");
    }
  };

  const toggleProductSelection = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId]
    }));
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Promoções</h2>
          <p className="text-muted-foreground">Gerencie promoções e descontos</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Promoção
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{promotions.length}</div>
            <p className="text-sm text-muted-foreground">Total de Promoções</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {promotions.filter(p => p.is_active).length}
            </div>
            <p className="text-sm text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {promotions.filter(p => p.is_featured).length}
            </div>
            <p className="text-sm text-muted-foreground">Em Destaque</p>
          </CardContent>
        </Card>
      </div>

      {/* Promotions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Promoções</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((promotion) => (
                <TableRow key={promotion.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{promotion.name}</div>
                      {promotion.is_featured && (
                        <Badge variant="secondary" className="mt-1">Destaque</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {promotion.discount_type === "percentage" ? (
                        <>
                          <Percent className="h-4 w-4" />
                          {promotion.discount_value}%
                        </>
                      ) : (
                        <>
                          R$ {promotion.discount_value.toFixed(2)}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {promotion.product_ids?.length || 0} produtos
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {promotion.start_date && (
                        <div>Início: {new Date(promotion.start_date).toLocaleDateString("pt-BR")}</div>
                      )}
                      {promotion.end_date && (
                        <div>Fim: {new Date(promotion.end_date).toLocaleDateString("pt-BR")}</div>
                      )}
                      {!promotion.start_date && !promotion.end_date && "Sem período definido"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={promotion.is_active}
                      onCheckedChange={() => toggleActive(promotion)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(promotion)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(promotion.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {promotions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma promoção cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPromotion ? "Editar Promoção" : "Nova Promoção"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome da Promoção *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Black Friday 2024"
                />
              </div>

              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da promoção..."
                />
              </div>

              <div>
                <Label>Tipo de Desconto</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value: "percentage" | "fixed") =>
                    setFormData({ ...formData, discount_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Valor do Desconto</Label>
                <Input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                  placeholder={formData.discount_type === "percentage" ? "10" : "25.00"}
                />
              </div>

              <div>
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Data de Término</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label>URL do Banner (opcional)</Label>
                <Input
                  value={formData.banner_image_url}
                  onChange={(e) => setFormData({ ...formData, banner_image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Ativa</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  />
                  <Label htmlFor="is_featured">Destaque</Label>
                </div>
              </div>
            </div>

            {/* Product Selection */}
            <div>
              <Label className="mb-2 block">Selecionar Produtos ({formData.product_ids.length} selecionados)</Label>
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={product.id}
                      checked={formData.product_ids.includes(product.id)}
                      onCheckedChange={() => toggleProductSelection(product.id)}
                    />
                    <label htmlFor={product.id} className="flex items-center gap-2 cursor-pointer flex-1">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-8 h-8 object-cover rounded"
                        />
                      )}
                      <span>{product.name}</span>
                      <span className="text-muted-foreground">
                        R$ {product.price.toFixed(2)}
                      </span>
                    </label>
                  </div>
                ))}
                {products.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum produto disponível
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingPromotion ? "Salvar Alterações" : "Criar Promoção"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromotionsManager;
