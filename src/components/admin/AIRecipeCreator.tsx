import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Sparkles, 
  ChefHat, 
  Clock, 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  RefreshCw,
  ShoppingCart,
  AlertTriangle,
  Save,
  Star,
  TrendingUp,
  Package
} from "lucide-react";

interface MatchedProduct {
  product_id: string;
  product_name: string;
  price: number;
  stock_quantity: number;
  image_url: string;
  in_stock: boolean;
}

interface AIRecipe {
  title: string;
  description: string;
  benefits: string;
  category: string;
  recipe_category: string;
  prep_time: string;
  difficulty: string;
  ingredients: string[];
  preparation: string[];
  spices: string[];
  nutritional_info: {
    calories?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
    fiber?: string;
  };
  tips?: string[];
  matched_products?: MatchedProduct[];
}

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  benefits: string | null;
  category: string;
  recipe_category: string | null;
  prep_time: string | null;
  difficulty: string | null;
  ingredients: string[];
  preparation: string[];
  spices: string[];
  nutritional_info: any;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_draft: boolean;
  ai_generated: boolean;
  views: number;
  sales_count: number;
  sort_order: number;
  created_at: string;
}

interface RecipeProduct {
  id: string;
  recipe_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  is_optional: boolean;
  notes: string | null;
  product?: {
    id: string;
    name: string;
    price: number;
    stock_quantity: number;
    image_url: string | null;
  };
}

const categoryLabels: Record<string, string> = {
  breakfast: "Café da Manhã",
  lunch: "Almoço",
  dinner: "Jantar",
};

const recipeCategoryLabels: Record<string, string> = {
  fitness: "Fitness",
  caseira: "Caseira",
  gourmet: "Gourmet",
  vegana: "Vegana",
  rapida: "Rápida",
  economica: "Econômica",
  premium: "Premium",
  saudavel: "Saudável",
};

const AIRecipeCreator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generatedRecipe, setGeneratedRecipe] = useState<AIRecipe | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeProducts, setRecipeProducts] = useState<RecipeProduct[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [variationDialogOpen, setVariationDialogOpen] = useState(false);
  const [variationType, setVariationType] = useState<string>("premium");

  // Form state for editing
  const [editForm, setEditForm] = useState<Partial<Recipe>>({});

  useEffect(() => {
    fetchRecipes();
    fetchProducts();
  }, []);

  const fetchRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecipes(data || []);
    } catch (error: any) {
      toast.error(`Erro ao carregar receitas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, price, stock_quantity, image_url')
      .eq('is_active', true);
    setAllProducts(data || []);
  };

  const fetchRecipeProducts = async (recipeId: string) => {
    const { data, error } = await supabase
      .from('recipe_products')
      .select(`
        *,
        product:products(id, name, price, stock_quantity, image_url)
      `)
      .eq('recipe_id', recipeId);

    if (!error && data) {
      setRecipeProducts(data);
    }
  };

  const generateRecipe = async () => {
    if (!prompt.trim()) {
      toast.error("Digite um tema ou ingrediente para a receita");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-recipe-generator', {
        body: { action: 'generate', prompt }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedRecipe(data);
      toast.success("Receita gerada com sucesso!");
    } catch (error: any) {
      toast.error(`Erro ao gerar receita: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveRecipe = async (asDraft: boolean = true) => {
    if (!generatedRecipe) return;

    setIsSaving(true);
    try {
      // Insert recipe
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          title: generatedRecipe.title,
          description: generatedRecipe.description,
          benefits: generatedRecipe.benefits,
          category: generatedRecipe.category,
          recipe_category: generatedRecipe.recipe_category,
          prep_time: generatedRecipe.prep_time,
          difficulty: generatedRecipe.difficulty,
          ingredients: generatedRecipe.ingredients,
          preparation: generatedRecipe.preparation,
          spices: generatedRecipe.spices,
          nutritional_info: generatedRecipe.nutritional_info,
          is_draft: asDraft,
          is_active: !asDraft,
          ai_generated: true,
        })
        .select()
        .single();

      if (recipeError) throw recipeError;

      // Link matched products
      if (generatedRecipe.matched_products && generatedRecipe.matched_products.length > 0) {
        const productLinks = generatedRecipe.matched_products.map(mp => ({
          recipe_id: recipe.id,
          product_id: mp.product_id,
          quantity: 1,
          unit: 'unidade',
        }));

        await supabase.from('recipe_products').insert(productLinks);
      }

      toast.success(asDraft ? "Receita salva como rascunho!" : "Receita publicada!");
      setGeneratedRecipe(null);
      setPrompt("");
      fetchRecipes();
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDialog = async (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setEditForm(recipe);
    await fetchRecipeProducts(recipe.id);
    setEditDialogOpen(true);
  };

  const updateRecipe = async () => {
    if (!selectedRecipe) return;

    try {
      const { error } = await supabase
        .from('recipes')
        .update({
          title: editForm.title,
          description: editForm.description,
          benefits: editForm.benefits,
          category: editForm.category,
          recipe_category: editForm.recipe_category,
          prep_time: editForm.prep_time,
          difficulty: editForm.difficulty,
          ingredients: editForm.ingredients,
          preparation: editForm.preparation,
          spices: editForm.spices,
          nutritional_info: editForm.nutritional_info,
          is_active: editForm.is_active,
          is_featured: editForm.is_featured,
          is_draft: editForm.is_draft,
        })
        .eq('id', selectedRecipe.id);

      if (error) throw error;

      toast.success("Receita atualizada!");
      setEditDialogOpen(false);
      fetchRecipes();
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  const deleteRecipe = async (id: string) => {
    if (!confirm("Excluir esta receita?")) return;

    try {
      await supabase.from('recipe_products').delete().eq('recipe_id', id);
      await supabase.from('recipes').delete().eq('id', id);
      toast.success("Receita excluída!");
      fetchRecipes();
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  const addProductToRecipe = async (productId: string) => {
    if (!selectedRecipe) return;

    try {
      const { error } = await supabase
        .from('recipe_products')
        .insert({
          recipe_id: selectedRecipe.id,
          product_id: productId,
          quantity: 1,
          unit: 'unidade',
        });

      if (error) throw error;
      
      await fetchRecipeProducts(selectedRecipe.id);
      toast.success("Produto adicionado!");
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  const removeProductFromRecipe = async (recipeProductId: string) => {
    try {
      await supabase.from('recipe_products').delete().eq('id', recipeProductId);
      if (selectedRecipe) await fetchRecipeProducts(selectedRecipe.id);
      toast.success("Produto removido!");
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  const generateVariation = async () => {
    if (!selectedRecipe) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-recipe-generator', {
        body: { 
          action: 'variation', 
          recipeId: selectedRecipe.id,
          variation: variationType 
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedRecipe(data);
      setVariationDialogOpen(false);
      setEditDialogOpen(false);
      toast.success(`Variação ${variationType} gerada!`);
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const checkStockAndSuggest = async (recipeId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-recipe-generator', {
        body: { action: 'suggest_substitutes', recipeId }
      });

      if (error) throw error;

      if (data.substitutes && data.substitutes.length > 0) {
        toast.info(
          <div>
            <p className="font-bold mb-2">Sugestões de Substitutos:</p>
            {data.substitutes.map((s: any, i: number) => (
              <p key={i} className="text-sm">
                {s.original} → {s.substitute}
              </p>
            ))}
          </div>,
          { duration: 10000 }
        );
      } else {
        toast.success("Todos os produtos estão em estoque!");
      }
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  const toggleFeatured = async (recipe: Recipe) => {
    try {
      await supabase
        .from('recipes')
        .update({ is_featured: !recipe.is_featured })
        .eq('id', recipe.id);
      
      fetchRecipes();
      toast.success(recipe.is_featured ? "Removido dos destaques" : "Adicionado aos destaques");
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  const publishRecipe = async (recipe: Recipe) => {
    try {
      await supabase
        .from('recipes')
        .update({ is_draft: false, is_active: true })
        .eq('id', recipe.id);
      
      fetchRecipes();
      toast.success("Receita publicada!");
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Generator Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Criar Receita com IA
          </CardTitle>
          <CardDescription>
            A IA criará uma receita usando os produtos do seu catálogo para maximizar vendas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tema ou ingredientes desejados</Label>
            <Textarea
              placeholder="Ex: Uma receita fitness com cúrcuma e gengibre para queima de gordura..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </div>
          
          <Button 
            onClick={generateRecipe} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Gerando receita...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Receita com IA
              </>
            )}
          </Button>

          {/* Generated Recipe Preview */}
          {generatedRecipe && (
            <Card className="mt-4 bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  {generatedRecipe.title}
                </CardTitle>
                <CardDescription>{generatedRecipe.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>{categoryLabels[generatedRecipe.category] || generatedRecipe.category}</Badge>
                  <Badge variant="outline">{recipeCategoryLabels[generatedRecipe.recipe_category] || generatedRecipe.recipe_category}</Badge>
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    {generatedRecipe.prep_time}
                  </Badge>
                  <Badge variant="secondary">{generatedRecipe.difficulty}</Badge>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Benefícios</h4>
                  <p className="text-sm text-muted-foreground">{generatedRecipe.benefits}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Ingredientes</h4>
                  <ul className="text-sm space-y-1">
                    {generatedRecipe.ingredients.map((ing, i) => (
                      <li key={i}>• {ing}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Modo de Preparo</h4>
                  <ol className="text-sm space-y-1 list-decimal list-inside">
                    {generatedRecipe.preparation.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>

                {generatedRecipe.matched_products && generatedRecipe.matched_products.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Produtos Vinculados ({generatedRecipe.matched_products.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {generatedRecipe.matched_products.map((mp, i) => (
                        <Badge 
                          key={i} 
                          variant={mp.in_stock ? "default" : "destructive"}
                        >
                          {mp.product_name} - R$ {mp.price}
                          {!mp.in_stock && <AlertTriangle className="h-3 w-3 ml-1" />}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {generatedRecipe.nutritional_info && (
                  <div>
                    <h4 className="font-semibold mb-2">Informações Nutricionais</h4>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {generatedRecipe.nutritional_info.calories && (
                        <Badge variant="outline">🔥 {generatedRecipe.nutritional_info.calories}</Badge>
                      )}
                      {generatedRecipe.nutritional_info.protein && (
                        <Badge variant="outline">💪 {generatedRecipe.nutritional_info.protein} proteína</Badge>
                      )}
                      {generatedRecipe.nutritional_info.carbs && (
                        <Badge variant="outline">🌾 {generatedRecipe.nutritional_info.carbs} carbs</Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button onClick={() => saveRecipe(true)} disabled={isSaving} variant="outline">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Rascunho
                  </Button>
                  <Button onClick={() => saveRecipe(false)} disabled={isSaving}>
                    <Eye className="h-4 w-4 mr-2" />
                    Publicar Agora
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Recipes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Receitas Cadastradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma receita cadastrada. Use a IA para criar sua primeira receita!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receita</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vendas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {recipe.ai_generated && <Sparkles className="h-4 w-4 text-primary" />}
                        <div>
                          <p className="font-medium">{recipe.title}</p>
                          <p className="text-sm text-muted-foreground">{recipe.prep_time}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit">
                          {categoryLabels[recipe.category] || recipe.category}
                        </Badge>
                        {recipe.recipe_category && (
                          <Badge variant="secondary" className="w-fit text-xs">
                            {recipeCategoryLabels[recipe.recipe_category] || recipe.recipe_category}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {recipe.is_draft && <Badge variant="secondary">Rascunho</Badge>}
                        {recipe.is_active && !recipe.is_draft && <Badge className="bg-green-500">Publicado</Badge>}
                        {recipe.is_featured && (
                          <Badge className="bg-yellow-500">
                            <Star className="h-3 w-3 mr-1" />
                            Destaque
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        {recipe.sales_count}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleFeatured(recipe)}
                          title={recipe.is_featured ? "Remover destaque" : "Destacar"}
                        >
                          <Star className={`h-4 w-4 ${recipe.is_featured ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                        </Button>
                        {recipe.is_draft && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => publishRecipe(recipe)}
                            title="Publicar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => checkStockAndSuggest(recipe.id)}
                          title="Verificar estoque"
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(recipe)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteRecipe(recipe.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Receita</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <Label>Benefícios</Label>
                <Textarea
                  value={editForm.benefits || ''}
                  onChange={(e) => setEditForm({ ...editForm, benefits: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Categoria</Label>
                  <Select
                    value={editForm.category}
                    onValueChange={(v) => setEditForm({ ...editForm, category: v })}
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
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={editForm.recipe_category || 'caseira'}
                    onValueChange={(v) => setEditForm({ ...editForm, recipe_category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(recipeCategoryLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Tempo de Preparo</Label>
                  <Input
                    value={editForm.prep_time || ''}
                    onChange={(e) => setEditForm({ ...editForm, prep_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Dificuldade</Label>
                  <Select
                    value={editForm.difficulty || 'Fácil'}
                    onValueChange={(v) => setEditForm({ ...editForm, difficulty: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fácil">Fácil</SelectItem>
                      <SelectItem value="Médio">Médio</SelectItem>
                      <SelectItem value="Difícil">Difícil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Ingredientes (um por linha)</Label>
                <Textarea
                  value={(editForm.ingredients || []).join('\n')}
                  onChange={(e) => setEditForm({ 
                    ...editForm, 
                    ingredients: e.target.value.split('\n').filter(Boolean) 
                  })}
                  rows={4}
                />
              </div>

              <div>
                <Label>Modo de Preparo (um passo por linha)</Label>
                <Textarea
                  value={(editForm.preparation || []).join('\n')}
                  onChange={(e) => setEditForm({ 
                    ...editForm, 
                    preparation: e.target.value.split('\n').filter(Boolean) 
                  })}
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editForm.is_active}
                    onCheckedChange={(v) => setEditForm({ ...editForm, is_active: v, is_draft: !v })}
                  />
                  <Label>Publicado</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editForm.is_featured}
                    onCheckedChange={(v) => setEditForm({ ...editForm, is_featured: v })}
                  />
                  <Label>Destaque</Label>
                </div>
              </div>

              {/* Linked Products */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Produtos Vinculados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recipeProducts.map((rp) => (
                    <div key={rp.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center gap-2">
                        {rp.product?.image_url && (
                          <img src={rp.product.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{rp.product?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            R$ {rp.product?.price} | Estoque: {rp.product?.stock_quantity}
                            {rp.product?.stock_quantity === 0 && (
                              <AlertTriangle className="h-3 w-3 inline ml-1 text-destructive" />
                            )}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeProductFromRecipe(rp.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Select onValueChange={addProductToRecipe}>
                    <SelectTrigger>
                      <SelectValue placeholder="Adicionar produto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allProducts
                        .filter(p => !recipeProducts.some(rp => rp.product_id === p.id))
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} - R$ {p.price}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* AI Variations */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Variações com IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Select value={variationType} onValueChange={setVariationType}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="economica">Versão Econômica</SelectItem>
                        <SelectItem value="premium">Versão Premium</SelectItem>
                        <SelectItem value="saudavel">Versão Saudável</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={generateVariation} disabled={isGenerating}>
                      {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={updateRecipe}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIRecipeCreator;
