import { useState, useEffect } from "react";
import { Clock, ChefHat, Leaf, Coffee, Sun, Moon, ChevronDown, ChevronUp, ShoppingCart, Sparkles, Star, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Recipe {
  id: string;
  title: string;
  description?: string;
  benefits: string;
  ingredients: string[];
  preparation: string[];
  spices: string[];
  prep_time?: string;
  difficulty?: string;
  recipe_category?: string;
  nutritional_info?: any;
  image_url?: string;
  is_featured?: boolean;
  ai_generated?: boolean;
}

interface LinkedProduct {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    stock_quantity: number;
    image_url: string | null;
    description: string | null;
  };
}

const recipeCategoryLabels: Record<string, string> = {
  fitness: "💪 Fitness",
  caseira: "🏠 Caseira",
  gourmet: "👨‍🍳 Gourmet",
  vegana: "🌱 Vegana",
  rapida: "⚡ Rápida",
  economica: "💰 Econômica",
  premium: "⭐ Premium",
  saudavel: "🥗 Saudável",
};

interface RecipeCardProps {
  recipe: Recipe;
  isOpen: boolean;
  onToggle: () => void;
  onBuyIngredients: (recipeId: string, spices: string[]) => void;
  linkedProducts?: LinkedProduct[];
}

const RecipeCard = ({ recipe, isOpen, onToggle, onBuyIngredients, linkedProducts }: RecipeCardProps) => {
  return (
    <Card className="overflow-hidden border-2 border-border hover:border-primary/30 transition-colors">
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className="p-6 cursor-pointer hover:bg-secondary/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-serif text-xl font-bold text-foreground">
                    {recipe.title}
                  </h3>
                  {recipe.is_featured && (
                    <Badge className="bg-yellow-500 text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Destaque
                    </Badge>
                  )}
                </div>
                
                {recipe.description && (
                  <p className="text-sm text-muted-foreground mb-2">{recipe.description}</p>
                )}
                
                <p className="text-sm text-primary font-medium mb-2">
                  ✨ {recipe.benefits}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-2">
                  {recipe.prep_time && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {recipe.prep_time}
                    </Badge>
                  )}
                  {recipe.difficulty && (
                    <Badge variant="outline" className="text-xs">
                      <ChefHat className="h-3 w-3 mr-1" />
                      {recipe.difficulty}
                    </Badge>
                  )}
                  {recipe.recipe_category && (
                    <Badge variant="secondary" className="text-xs">
                      {recipeCategoryLabels[recipe.recipe_category] || recipe.recipe_category}
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {recipe.spices.slice(0, 4).map((spice, idx) => (
                    <span 
                      key={idx} 
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                    >
                      🌿 {spice}
                    </span>
                  ))}
                  {recipe.spices.length > 4 && (
                    <span className="text-xs text-muted-foreground">
                      +{recipe.spices.length - 4} mais
                    </span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="ml-4">
                {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-6 pb-6 border-t border-border pt-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-primary" />
                  Ingredientes
                </h4>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                      {ingredient}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-accent" />
                  Modo de Preparo
                </h4>
                <ol className="space-y-2">
                  {recipe.preparation.map((step, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="font-bold text-primary">{idx + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Nutritional Info */}
            {recipe.nutritional_info && Object.keys(recipe.nutritional_info).length > 0 && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">📊 Informações Nutricionais (por porção)</h4>
                <div className="flex flex-wrap gap-3 text-sm">
                  {recipe.nutritional_info.calories && (
                    <span className="px-2 py-1 bg-background rounded">🔥 {recipe.nutritional_info.calories}</span>
                  )}
                  {recipe.nutritional_info.protein && (
                    <span className="px-2 py-1 bg-background rounded">💪 {recipe.nutritional_info.protein}</span>
                  )}
                  {recipe.nutritional_info.carbs && (
                    <span className="px-2 py-1 bg-background rounded">🌾 {recipe.nutritional_info.carbs}</span>
                  )}
                  {recipe.nutritional_info.fat && (
                    <span className="px-2 py-1 bg-background rounded">🥑 {recipe.nutritional_info.fat}</span>
                  )}
                </div>
              </div>
            )}

            {/* Linked Products Preview */}
            {linkedProducts && linkedProducts.length > 0 && (
              <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  Produtos Recomendados
                </h4>
                <div className="flex flex-wrap gap-3">
                  {linkedProducts.map((lp) => (
                    <div key={lp.id} className="flex items-center gap-2 bg-background p-2 rounded-lg">
                      {lp.product.image_url && (
                        <img src={lp.product.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{lp.product.name}</p>
                        <p className="text-xs text-muted-foreground">R$ {lp.product.price.toFixed(2)}</p>
                      </div>
                      {lp.product.stock_quantity === 0 && (
                        <Badge variant="destructive" className="text-xs">Esgotado</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Buy Ingredients Button */}
            <div className="mt-6 pt-4 border-t border-border">
              <Button 
                onClick={(e) => { e.stopPropagation(); onBuyIngredients(recipe.id, recipe.spices); }}
                className="w-full md:w-auto"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Compre os ingredientes desta receita
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

const Recipes = () => {
  const [openRecipes, setOpenRecipes] = useState<string[]>([]);
  const [dbRecipes, setDbRecipes] = useState<Recipe[]>([]);
  const [recipeProducts, setRecipeProducts] = useState<Record<string, LinkedProduct[]>>({});
  const [loading, setLoading] = useState(true);
  const { addToCart, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('is_active', true)
        .eq('is_draft', false)
        .order('is_featured', { ascending: false })
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Transform to Recipe interface
      const recipes: Recipe[] = (data || []).map(r => ({
        id: r.id,
        title: r.title,
        description: r.description || undefined,
        benefits: r.benefits || '',
        ingredients: r.ingredients || [],
        preparation: r.preparation || [],
        spices: r.spices || [],
        prep_time: r.prep_time || undefined,
        difficulty: r.difficulty || undefined,
        recipe_category: r.recipe_category || undefined,
        nutritional_info: r.nutritional_info || undefined,
        image_url: r.image_url || undefined,
        is_featured: r.is_featured || false,
        ai_generated: r.ai_generated || false,
      }));

      setDbRecipes(recipes);

      // Fetch linked products for all recipes
      if (recipes.length > 0) {
        const { data: products } = await supabase
          .from('recipe_products')
          .select(`
            id,
            recipe_id,
            product_id,
            quantity,
            product:products(id, name, price, stock_quantity, image_url, description)
          `)
          .in('recipe_id', recipes.map(r => r.id));

        if (products) {
          const grouped: Record<string, LinkedProduct[]> = {};
          products.forEach((p: any) => {
            if (!grouped[p.recipe_id]) grouped[p.recipe_id] = [];
            grouped[p.recipe_id].push(p);
          });
          setRecipeProducts(grouped);
        }
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecipe = (id: string) => {
    setOpenRecipes(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleBuyIngredients = async (recipeId: string, spices: string[]) => {
    try {
      // First check for linked products
      const linkedProds = recipeProducts[recipeId];
      
      if (linkedProds && linkedProds.length > 0) {
        // Add linked products that are in stock
        const inStockProducts = linkedProds.filter(lp => lp.product.stock_quantity > 0);
        
        if (inStockProducts.length === 0) {
          toast.error("Todos os produtos desta receita estão esgotados");
          return;
        }

        inStockProducts.forEach(lp => {
          addToCart({
            id: parseInt(lp.product.id.slice(0, 8), 16) || Math.random(),
            name: lp.product.name,
            description: lp.product.description || "",
            price: lp.product.price,
            image: lp.product.image_url || "",
            rating: 5,
            reviews: 0,
            badges: [],
            category: "",
          }, lp.quantity);
        });

        // Track the sale intent
        await supabase.from('recipe_sales').insert({
          recipe_id: recipeId,
          products_sold: inStockProducts.map(lp => ({ 
            product_id: lp.product_id, 
            name: lp.product.name,
            price: lp.product.price 
          })),
          total_amount: inStockProducts.reduce((sum, lp) => sum + (lp.product.price * lp.quantity), 0),
        });

        // Update recipe sales count
        const { data: recipe } = await supabase
          .from('recipes')
          .select('sales_count')
          .eq('id', recipeId)
          .single();
        
        if (recipe) {
          await supabase
            .from('recipes')
            .update({ sales_count: (recipe.sales_count || 0) + 1 })
            .eq('id', recipeId);
        }

        toast.success(`${inStockProducts.length} produto(s) adicionado(s) ao carrinho!`);
        setIsCartOpen(true);
        return;
      }

      // Fallback: search by spice names
      const searchTerms = spices.map(s => s.replace(" Species", "").toLowerCase());
      
      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, price, image_url, description, stock_quantity")
        .eq("is_active", true);

      if (error) throw error;

      const matchingProducts = products?.filter(product => 
        searchTerms.some(term => 
          product.name.toLowerCase().includes(term)
        ) && product.stock_quantity > 0
      ) || [];

      if (matchingProducts.length === 0) {
        toast.info("Produtos não encontrados. Redirecionando para a loja...");
        navigate("/produtos");
        return;
      }

      matchingProducts.forEach(product => {
        addToCart({
          id: parseInt(product.id.slice(0, 8), 16) || Math.random(),
          name: product.name,
          description: product.description || "",
          price: product.price,
          image: product.image_url || "",
          rating: 5,
          reviews: 0,
          badges: [],
          category: "",
        });
      });

      toast.success(`${matchingProducts.length} tempero(s) adicionado(s) ao carrinho!`);
      setIsCartOpen(true);
    } catch (error) {
      console.error("Error finding products:", error);
      toast.error("Erro ao buscar produtos");
    }
  };

  // Separate recipes by category
  const breakfastRecipes = dbRecipes.filter(r => r.id && dbRecipes.some(d => d.id === r.id) && 
    (dbRecipes.find(d => d.id === r.id) as any)?.category === 'breakfast'
  ) || dbRecipes.filter((_, i) => i % 3 === 0);
  
  const lunchRecipes = dbRecipes.filter((_, i) => i % 3 === 1);
  const dinnerRecipes = dbRecipes.filter((_, i) => i % 3 === 2);

  // Also filter by actual category from db
  const getRecipesByCategory = (category: string) => {
    return dbRecipes.filter(r => {
      const dbRecipe = dbRecipes.find(d => d.id === r.id);
      // Use stored category or fallback to distribution
      return (dbRecipe as any)?.category === category;
    });
  };

  const breakfastFromDb = getRecipesByCategory('breakfast');
  const lunchFromDb = getRecipesByCategory('lunch');
  const dinnerFromDb = getRecipesByCategory('dinner');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24">
        {/* Hero Section */}
        <section className="relative bg-gradient-hero py-20 md:py-32">
          <div className="container-species text-center text-spice-warm-white">
            <span className="inline-block px-4 py-1 bg-spice-warm-white/20 rounded-full text-spice-warm-white font-medium text-sm mb-4">
              👨‍🍳 Receitas Species
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              Receitas com Temperos Species
            </h1>
            <p className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto">
              Descubra como usar nossos temperos para criar pratos incríveis do café da manhã ao jantar.
            </p>
          </div>
        </section>

        {/* Featured Recipes */}
        {dbRecipes.filter(r => r.is_featured).length > 0 && (
          <section className="py-12 bg-primary/5">
            <div className="container-species">
              <h2 className="font-serif text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Star className="h-6 w-6 text-yellow-500" />
                Receitas em Destaque
              </h2>
              <div className="space-y-4">
                {dbRecipes.filter(r => r.is_featured).map(recipe => (
                  <RecipeCard 
                    key={recipe.id} 
                    recipe={recipe} 
                    isOpen={openRecipes.includes(recipe.id)}
                    onToggle={() => toggleRecipe(recipe.id)}
                    onBuyIngredients={handleBuyIngredients}
                    linkedProducts={recipeProducts[recipe.id]}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Tabs Section */}
        <section className="py-16 md:py-24">
          <div className="container-species">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Carregando receitas...</p>
              </div>
            ) : dbRecipes.length === 0 ? (
              <div className="text-center py-12">
                <ChefHat className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Nenhuma receita disponível</h2>
                <p className="text-muted-foreground">
                  Em breve teremos receitas deliciosas para você!
                </p>
              </div>
            ) : (
              <Tabs defaultValue="breakfast" className="w-full">
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-12">
                  <TabsTrigger value="breakfast" className="flex items-center gap-2">
                    <Coffee className="h-4 w-4" />
                    <span className="hidden sm:inline">Café da Manhã</span>
                    <span className="sm:hidden">Manhã</span>
                  </TabsTrigger>
                  <TabsTrigger value="lunch" className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <span>Almoço</span>
                  </TabsTrigger>
                  <TabsTrigger value="dinner" className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    <span>Jantar</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="breakfast">
                  <div className="max-w-4xl mx-auto space-y-4">
                    {breakfastFromDb.length > 0 ? (
                      breakfastFromDb.map(recipe => (
                        <RecipeCard 
                          key={recipe.id} 
                          recipe={recipe} 
                          isOpen={openRecipes.includes(recipe.id)}
                          onToggle={() => toggleRecipe(recipe.id)}
                          onBuyIngredients={handleBuyIngredients}
                          linkedProducts={recipeProducts[recipe.id]}
                        />
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Coffee className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma receita de café da manhã disponível ainda.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="lunch">
                  <div className="max-w-4xl mx-auto space-y-4">
                    {lunchFromDb.length > 0 ? (
                      lunchFromDb.map(recipe => (
                        <RecipeCard 
                          key={recipe.id} 
                          recipe={recipe} 
                          isOpen={openRecipes.includes(recipe.id)}
                          onToggle={() => toggleRecipe(recipe.id)}
                          onBuyIngredients={handleBuyIngredients}
                          linkedProducts={recipeProducts[recipe.id]}
                        />
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Sun className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma receita de almoço disponível ainda.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="dinner">
                  <div className="max-w-4xl mx-auto space-y-4">
                    {dinnerFromDb.length > 0 ? (
                      dinnerFromDb.map(recipe => (
                        <RecipeCard 
                          key={recipe.id} 
                          recipe={recipe} 
                          isOpen={openRecipes.includes(recipe.id)}
                          onToggle={() => toggleRecipe(recipe.id)}
                          onBuyIngredients={handleBuyIngredients}
                          linkedProducts={recipeProducts[recipe.id]}
                        />
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Moon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma receita de jantar disponível ainda.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </section>

        {/* All Recipes Grid */}
        {dbRecipes.filter(r => !r.is_featured).length > 0 && (
          <section className="py-12 bg-muted/30">
            <div className="container-species">
              <h2 className="font-serif text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                Todas as Receitas
              </h2>
              <div className="space-y-4">
                {dbRecipes.filter(r => !r.is_featured).map(recipe => (
                  <RecipeCard 
                    key={recipe.id} 
                    recipe={recipe} 
                    isOpen={openRecipes.includes(recipe.id)}
                    onToggle={() => toggleRecipe(recipe.id)}
                    onBuyIngredients={handleBuyIngredients}
                    linkedProducts={recipeProducts[recipe.id]}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Recipes;
