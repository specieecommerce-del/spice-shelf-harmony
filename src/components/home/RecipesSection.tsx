import { useState, useEffect } from "react";
import { Clock, ChefHat, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import recipeBreakfast from "@/assets/recipe-breakfast.jpg";
import recipeLunch from "@/assets/recipe-lunch.jpg";
import recipeDinner from "@/assets/recipe-dinner.jpg";

const categoryImages: Record<string, string> = {
  breakfast: recipeBreakfast,
  lunch: recipeLunch,
  dinner: recipeDinner,
};

const categoryLabels: Record<string, string> = {
  breakfast: "Café da Manhã",
  lunch: "Almoço",
  dinner: "Jantar",
};

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  category: string;
  prep_time: string | null;
  difficulty: string | null;
  image_url: string | null;
  spices: string[];
}

const RecipesSection = () => {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("id, title, description, category, prep_time, difficulty, image_url, spices")
        .eq("is_active", true)
        .eq("is_draft", false)
        .order("is_featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .limit(3);

      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      console.error("Error loading recipes:", error);
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading skeleton
  if (isLoading || recipes === null) {
    return (
      <section className="py-16 lg:py-24 bg-spice-warm-white" id="receitas">
        <div className="container-species">
          <div className="text-center mb-12">
            <div className="h-8 w-32 bg-muted rounded-full mx-auto mb-4 animate-pulse" />
            <div className="h-10 w-64 bg-muted rounded mx-auto mb-4 animate-pulse" />
            <div className="h-6 w-96 bg-muted rounded mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl overflow-hidden animate-pulse">
                <div className="h-48 bg-muted" />
                <div className="p-6">
                  <div className="flex gap-4 mb-3">
                    <div className="h-4 w-16 bg-muted rounded" />
                    <div className="h-4 w-16 bg-muted rounded" />
                  </div>
                  <div className="h-6 w-48 bg-muted rounded mb-2" />
                  <div className="h-4 w-full bg-muted rounded mb-4" />
                  <div className="flex justify-between">
                    <div className="h-6 w-32 bg-muted rounded" />
                    <div className="h-4 w-20 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Empty state
  if (recipes.length === 0) {
    return null;
  }

  return (
    <section className="py-16 lg:py-24 bg-spice-warm-white" id="receitas">
      <div className="container-species">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 bg-primary/10 rounded-full text-primary font-medium text-sm mb-4">
            👨‍🍳 Inspire-se
          </span>
          <h2 className="font-serif text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Receitas com Species
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Descubra como usar nossos temperos para criar pratos incríveis do
            café da manhã ao jantar.
          </p>
        </div>

        {/* Recipes grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {recipes.map((recipe) => (
            <article
              key={recipe.id}
              className="group bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300"
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={recipe.image_url || categoryImages[recipe.category] || recipeBreakfast}
                  alt={recipe.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 bg-spice-forest text-spice-warm-white text-xs font-medium rounded-full">
                    {categoryLabels[recipe.category] || recipe.category}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  {recipe.prep_time && (
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {recipe.prep_time}
                    </span>
                  )}
                  {recipe.difficulty && (
                    <span className="flex items-center gap-1">
                      <ChefHat size={14} />
                      {recipe.difficulty}
                    </span>
                  )}
                </div>

                <h3 className="font-serif text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {recipe.title}
                </h3>

                {recipe.description && (
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {recipe.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  {recipe.spices && recipe.spices.length > 0 && (
                    <span className="text-xs bg-secondary px-3 py-1 rounded-full text-secondary-foreground">
                      🌿 {recipe.spices[0]}
                    </span>
                  )}
                  <Link
                    to="/receitas"
                    className="flex items-center gap-1 text-primary text-sm font-medium hover:gap-2 transition-all"
                  >
                    Ver receita
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* View all button */}
        <div className="text-center mt-12">
          <Button variant="default" size="lg" asChild>
            <Link to="/receitas">Ver Todas as Receitas</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default RecipesSection;
