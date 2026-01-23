import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, ChefHat } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Recipe {
  id: string;
  title: string;
  category: string;
  benefits: string | null;
  ingredients: string[];
  preparation: string[];
  spices: string[];
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

const categoryLabels: Record<string, string> = {
  breakfast: "Café da Manhã",
  lunch: "Almoço",
  dinner: "Jantar",
};

const RecipesManager = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "breakfast",
    benefits: "",
    ingredients: "",
    preparation: "",
    spices: "",
    image_url: "",
    is_active: true,
    sort_order: 0,
  });

  const fetchRecipes = async () => {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar receitas");
      return;
    }
    setRecipes(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const resetForm = () => {
    setFormData({
      title: "",
      category: "breakfast",
      benefits: "",
      ingredients: "",
      preparation: "",
      spices: "",
      image_url: "",
      is_active: true,
      sort_order: 0,
    });
    setEditingRecipe(null);
  };

  const openEditDialog = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      title: recipe.title,
      category: recipe.category,
      benefits: recipe.benefits || "",
      ingredients: recipe.ingredients.join("\n"),
      preparation: recipe.preparation.join("\n"),
      spices: recipe.spices.join(", "),
      image_url: recipe.image_url || "",
      is_active: recipe.is_active,
      sort_order: recipe.sort_order,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    const recipeData = {
      title: formData.title,
      category: formData.category,
      benefits: formData.benefits || null,
      ingredients: formData.ingredients.split("\n").filter(i => i.trim()),
      preparation: formData.preparation.split("\n").filter(p => p.trim()),
      spices: formData.spices.split(",").map(s => s.trim()).filter(s => s),
      image_url: formData.image_url || null,
      is_active: formData.is_active,
      sort_order: formData.sort_order,
    };

    if (editingRecipe) {
      const { error } = await supabase
        .from("recipes")
        .update(recipeData)
        .eq("id", editingRecipe.id);

      if (error) {
        toast.error("Erro ao atualizar receita");
        return;
      }
      toast.success("Receita atualizada!");
    } else {
      const { error } = await supabase
        .from("recipes")
        .insert(recipeData);

      if (error) {
        toast.error("Erro ao criar receita");
        return;
      }
      toast.success("Receita criada!");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchRecipes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta receita?")) return;

    const { error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir receita");
      return;
    }
    toast.success("Receita excluída!");
    fetchRecipes();
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from("recipes")
      .update({ is_active: !currentState })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    fetchRecipes();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Receitas</h2>
          <p className="text-muted-foreground">Gerencie as receitas do site</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Receita
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRecipe ? "Editar Receita" : "Nova Receita"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Nome da receita"
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Café da Manhã</SelectItem>
                      <SelectItem value="lunch">Almoço</SelectItem>
                      <SelectItem value="dinner">Jantar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Benefícios</Label>
                <Input
                  value={formData.benefits}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  placeholder="Ex: rico em fibras, energia gradual"
                />
              </div>
              <div>
                <Label>Ingredientes (um por linha)</Label>
                <Textarea
                  value={formData.ingredients}
                  onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                  placeholder="3 colheres de aveia&#10;200ml de leite&#10;1 banana"
                  rows={5}
                />
              </div>
              <div>
                <Label>Modo de Preparo (um passo por linha)</Label>
                <Textarea
                  value={formData.preparation}
                  onChange={(e) => setFormData({ ...formData, preparation: e.target.value })}
                  placeholder="Aqueça o leite&#10;Adicione a aveia&#10;Mexa até engrossar"
                  rows={5}
                />
              </div>
              <div>
                <Label>Temperos Species (separados por vírgula)</Label>
                <Input
                  value={formData.spices}
                  onChange={(e) => setFormData({ ...formData, spices: e.target.value })}
                  placeholder="Canela, Gengibre, Cúrcuma"
                />
              </div>
              <div>
                <Label>URL da Imagem</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Receita ativa</Label>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingRecipe ? "Salvar Alterações" : "Criar Receita"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {recipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ChefHat className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma receita cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Temperos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipes.map((recipe) => (
                <TableRow key={recipe.id}>
                  <TableCell className="font-medium">{recipe.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {categoryLabels[recipe.category] || recipe.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {recipe.spices.join(", ")}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={recipe.is_active}
                      onCheckedChange={() => toggleActive(recipe.id, recipe.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(recipe)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(recipe.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default RecipesManager;
