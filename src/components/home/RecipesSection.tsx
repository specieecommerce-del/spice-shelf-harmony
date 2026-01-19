import { Clock, ChefHat, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

import recipeBreakfast from "@/assets/recipe-breakfast.jpg";
import recipeLunch from "@/assets/recipe-lunch.jpg";
import recipeDinner from "@/assets/recipe-dinner.jpg";

const recipes = [
  {
    id: 1,
    title: "Omelete de Ervas",
    category: "Café da Manhã",
    time: "15 min",
    difficulty: "Fácil",
    image: recipeBreakfast,
    spice: "Mix Ervas Provence",
    description: "Comece o dia com um omelete aromático e nutritivo",
  },
  {
    id: 2,
    title: "Frango com Cúrcuma",
    category: "Almoço",
    time: "45 min",
    difficulty: "Médio",
    image: recipeLunch,
    spice: "Cúrcuma Orgânica",
    description: "Peito de frango suculento com toque dourado",
  },
  {
    id: 3,
    title: "Massa ao Alho e Orégano",
    category: "Jantar",
    time: "30 min",
    difficulty: "Fácil",
    image: recipeDinner,
    spice: "Orégano Premium",
    description: "Um clássico italiano para noites especiais",
  },
];

const RecipesSection = () => {
  return (
    <section className="py-16 lg:py-24 bg-spice-cream" id="receitas">
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
                  src={recipe.image}
                  alt={recipe.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 bg-spice-forest text-spice-warm-white text-xs font-medium rounded-full">
                    {recipe.category}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {recipe.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <ChefHat size={14} />
                    {recipe.difficulty}
                  </span>
                </div>

                <h3 className="font-serif text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {recipe.title}
                </h3>

                <p className="text-muted-foreground text-sm mb-4">
                  {recipe.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs bg-secondary px-3 py-1 rounded-full text-secondary-foreground">
                    🌿 {recipe.spice}
                  </span>
                  <a
                    href="#"
                    className="flex items-center gap-1 text-primary text-sm font-medium hover:gap-2 transition-all"
                  >
                    Ver receita
                    <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* View all button */}
        <div className="text-center mt-12">
          <Button variant="default" size="lg">
            Ver Todas as Receitas
          </Button>
        </div>
      </div>
    </section>
  );
};

export default RecipesSection;
