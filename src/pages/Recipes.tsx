import { useState } from "react";
import { Clock, ChefHat, Leaf, Coffee, Sun, Moon, ChevronDown, ChevronUp } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import recipeBreakfast from "@/assets/recipe-breakfast.jpg";
import recipeLunch from "@/assets/recipe-lunch.jpg";
import recipeDinner from "@/assets/recipe-dinner.jpg";

interface Recipe {
  id: number;
  title: string;
  benefits: string;
  ingredients: string[];
  preparation: string[];
  spices: string[];
}

const breakfastIntro = {
  title: "Receitas de Café da Manhã",
  description: "Saiba o porquê de usar alguns temperos e condimentos em seu café da manhã!",
  tips: [
    { spice: "Cúrcuma", benefit: "Poderoso antioxidante" },
    { spice: "Pimenta-do-reino", benefit: "Melhora a absorção de nutrientes e acelera o metabolismo" },
    { spice: "Canela", benefit: "Ajuda no controle glicêmico" },
    { spice: "Gengibre em pó", benefit: "Ajuda no metabolismo" },
  ],
};

const breakfastRecipes: Recipe[] = [
  {
    id: 1,
    title: "Mingau de Aveia FIT com Canela",
    benefits: "Rico em fibras, saciedade e energia gradual",
    ingredients: [
      "3 colheres (sopa) de aveia em flocos finos",
      "200 ml de bebida vegetal sem açúcar (amêndoas, coco ou aveia)",
      "1 colher (chá) de canela em pó Species",
      "1 colher (chá) de chia ou linhaça",
      "Adoçante natural a gosto (opcional)",
    ],
    preparation: [
      "Aqueça a bebida vegetal com a aveia em fogo baixo.",
      "Mexa até engrossar.",
      "Acrescente canela e chia.",
      "Sirva quente.",
    ],
    spices: ["Canela Species"],
  },
  {
    id: 2,
    title: "Torrada Integral FIT com Canela e Pasta de Amendoim",
    benefits: "Energia + gordura boa",
    ingredients: [
      "1 fatia de pão integral 100%",
      "1 colher (sopa) de pasta de amendoim integral (sem açúcar)",
      "1 pitada de canela em pó Species",
    ],
    preparation: [
      "Torre o pão.",
      "Espalhe a pasta de amendoim.",
      "Polvilhe canela.",
    ],
    spices: ["Canela Species"],
  },
  {
    id: 3,
    title: "Vitamina FIT de Banana com Canela e Gengibre em Pó",
    benefits: "Pré-treino natural e digestivo",
    ingredients: [
      "1 banana pequena congelada",
      "200 ml de bebida vegetal ou leite desnatado",
      "1 colher (chá) de canela Species",
      "1 pitada de gengibre em pó Species",
      "1 colher (sopa) de aveia ou proteína vegetal (opcional)",
    ],
    preparation: [
      "Bata tudo no liquidificador.",
      "Sirva imediatamente.",
    ],
    spices: ["Canela Species", "Gengibre em pó Species"],
  },
  {
    id: 4,
    title: "Ovos Mexidos FIT com Cúrcuma e Pimenta-do-Reino",
    benefits: "Alto teor de proteína e baixo carboidrato",
    ingredients: [
      "2 ovos",
      "1 colher (chá) de azeite de oliva",
      "1 pitada de cúrcuma em pó Species",
      "Pimenta-do-reino a gosto",
      "Sal rosa Species",
    ],
    preparation: [
      "Bata os ovos com a cúrcuma, pimenta e sal.",
      "Aqueça o azeite em fogo baixo.",
      "Cozinhe mexendo lentamente até ficarem cremosos.",
    ],
    spices: ["Cúrcuma Species", "Pimenta-do-reino", "Sal rosa Species"],
  },
];

const lunchIntro = {
  title: "Receitas para Almoço",
  description: "Essas receitas são práticas, mas também valorizam especiarias e temperos que atuam como protagonistas perfeitas para a refeição que vai dar aquela energia para terminar as tarefas restantes do dia.",
  tip: "Especiarias e temperos naturais intensificam o sabor dos alimentos, reduzindo a necessidade de sal e produtos industrializados.",
};

const lunchRecipes: Recipe[] = [
  {
    id: 5,
    title: "Frango Grelhado com Páprica, Alho e Ervas",
    benefits: "Proteína magra com sabor intenso",
    ingredients: [
      "Peito de frango",
      "Páprica doce",
      "Alho amassado",
      "Alecrim fresco ou seco",
      "Pimenta-do-reino",
      "Azeite e sal",
    ],
    preparation: [
      "Tempere o frango com todos os ingredientes.",
      "Deixe marinar 20 minutos.",
      "Grelhe até dourar.",
    ],
    spices: ["Páprica doce", "Alho", "Alecrim", "Pimenta-do-reino"],
  },
  {
    id: 6,
    title: "Arroz Integral Aromatizado com Cúrcuma e Louro",
    benefits: "Carboidrato complexo com propriedades anti-inflamatórias",
    ingredients: [
      "Arroz integral",
      "Cúrcuma em pó",
      "Folha de louro",
      "Cebola e alho",
      "Azeite e sal",
    ],
    preparation: [
      "Refogue os temperos.",
      "Acrescente o arroz.",
      "Adicione água quente e cozinhe até ficar macio.",
    ],
    spices: ["Cúrcuma Species", "Louro", "Alho", "Cebola"],
  },
  {
    id: 7,
    title: "Legumes Assados com Cominho, Páprica e Tomilho",
    benefits: "Rico em fibras e vitaminas",
    ingredients: [
      "Abobrinha, cenoura, batata-doce, cebola",
      "Cominho",
      "Páprica",
      "Tomilho",
      "Azeite e sal",
    ],
    preparation: [
      "Misture todos os ingredientes.",
      "Leve ao forno a 200°C por 30-40 minutos.",
    ],
    spices: ["Cominho", "Páprica", "Tomilho"],
  },
  {
    id: 8,
    title: "Carne Moída Refogada com Canela, Noz-Moscada e Pimenta",
    benefits: "Proteína com toque especial",
    ingredients: [
      "Carne moída magra",
      "Cebola e alho",
      "Canela (pitada)",
      "Noz-moscada",
      "Pimenta-do-reino",
    ],
    preparation: [
      "Refogue a carne com cebola e alho.",
      "Finalize com as especiarias.",
    ],
    spices: ["Canela", "Noz-moscada", "Pimenta-do-reino"],
  },
];

const dinnerIntro = {
  title: "Receitas para Jantar",
  description: "O uso de temperos e especiarias no jantar ajudam na digestão e promovem sensação de bem-estar.",
  tip: "Escolhemos para o jantar dicas de receitas que usem especiarias e temperos que tragam calma e que sejam confortantes. Tudo o que precisamos para encerrar bem o dia e nos prepararmos para o dia seguinte.",
};

const dinnerRecipes: Recipe[] = [
  {
    id: 9,
    title: "Peixe Grelhado com Limão, Coentro e Pimenta Rosa",
    benefits: "Leve e rico em ômega-3",
    ingredients: [
      "Filé de peixe",
      "Limão",
      "Coentro fresco ou seco",
      "Pimenta rosa",
      "Azeite e sal",
    ],
    preparation: [
      "Tempere o peixe.",
      "Grelhe rapidamente em fogo médio.",
    ],
    spices: ["Coentro", "Pimenta rosa"],
  },
  {
    id: 10,
    title: "Sopa de Abóbora com Gengibre e Cúrcuma",
    benefits: "Reconfortante e anti-inflamatória",
    ingredients: [
      "Abóbora",
      "Gengibre fresco ralado",
      "Cúrcuma",
      "Caldo de legumes",
      "Sal e azeite",
    ],
    preparation: [
      "Cozinhe a abóbora com os temperos.",
      "Bata no liquidificador.",
      "Ajuste os temperos.",
    ],
    spices: ["Gengibre Species", "Cúrcuma Species", "Pimenta-do-reino"],
  },
  {
    id: 11,
    title: "Omelete de Ervas com Orégano, Cebolinha e Pimenta",
    benefits: "Proteína leve para a noite",
    ingredients: [
      "Ovos",
      "Orégano",
      "Cebolinha",
      "Pimenta-do-reino",
      "Sal e azeite",
    ],
    preparation: [
      "Misture tudo.",
      "Prepare em frigideira antiaderente.",
    ],
    spices: ["Orégano", "Pimenta-do-reino"],
  },
  {
    id: 12,
    title: "Grão-de-Bico Refogado com Curry e Páprica Defumada",
    benefits: "Rico em proteínas vegetais",
    ingredients: [
      "Grão-de-bico cozido",
      "Curry em pó",
      "Páprica defumada",
      "Alho e cebola",
      "Azeite e sal",
    ],
    preparation: [
      "Refogue os temperos.",
      "Acrescente o grão-de-bico.",
      "Salteie até aromatizar.",
    ],
    spices: ["Curry", "Páprica defumada", "Alho"],
  },
];

const RecipeCard = ({ recipe, isOpen, onToggle }: { recipe: Recipe; isOpen: boolean; onToggle: () => void }) => {
  return (
    <Card className="overflow-hidden border-2 border-border hover:border-primary/30 transition-colors">
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className="p-6 cursor-pointer hover:bg-secondary/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">
                  {recipe.title}
                </h3>
                <p className="text-sm text-primary font-medium mb-2">
                  ✨ {recipe.benefits}
                </p>
                <div className="flex flex-wrap gap-2">
                  {recipe.spices.map((spice, idx) => (
                    <span 
                      key={idx} 
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                    >
                      🌿 {spice}
                    </span>
                  ))}
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
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

const Recipes = () => {
  const [openRecipes, setOpenRecipes] = useState<number[]>([]);

  const toggleRecipe = (id: number) => {
    setOpenRecipes(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

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

        {/* Tabs Section */}
        <section className="py-16 md:py-24">
          <div className="container-species">
            <Tabs defaultValue="breakfast" className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-12">
                <TabsTrigger value="breakfast" className="flex items-center gap-2">
                  <Coffee className="h-4 w-4" />
                  <span className="hidden sm:inline">Café da Manhã</span>
                  <span className="sm:hidden">Manhã</span>
                </TabsTrigger>
                <TabsTrigger value="lunch" className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  <span className="hidden sm:inline">Almoço</span>
                  <span className="sm:hidden">Almoço</span>
                </TabsTrigger>
                <TabsTrigger value="dinner" className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  <span className="hidden sm:inline">Jantar</span>
                  <span className="sm:hidden">Jantar</span>
                </TabsTrigger>
              </TabsList>

              {/* Breakfast Tab */}
              <TabsContent value="breakfast">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="font-serif text-3xl lg:text-4xl font-bold text-foreground mb-4">
                      {breakfastIntro.title}
                    </h2>
                    <p className="text-lg text-muted-foreground mb-6">
                      {breakfastIntro.description}
                    </p>
                    
                    {/* Tips Grid */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                      {breakfastIntro.tips.map((tip, idx) => (
                        <Card key={idx} className="bg-primary/5 border-primary/20">
                          <CardContent className="p-4 text-center">
                            <p className="font-semibold text-primary">{tip.spice}</p>
                            <p className="text-sm text-muted-foreground">{tip.benefit}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {breakfastRecipes.map(recipe => (
                      <RecipeCard 
                        key={recipe.id} 
                        recipe={recipe} 
                        isOpen={openRecipes.includes(recipe.id)}
                        onToggle={() => toggleRecipe(recipe.id)}
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Lunch Tab */}
              <TabsContent value="lunch">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="font-serif text-3xl lg:text-4xl font-bold text-foreground mb-4">
                      🍽️ {lunchIntro.title}
                    </h2>
                    <p className="text-lg text-muted-foreground mb-4">
                      {lunchIntro.description}
                    </p>
                    <p className="text-sm text-primary bg-primary/10 inline-block px-4 py-2 rounded-lg">
                      💡 {lunchIntro.tip}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {lunchRecipes.map(recipe => (
                      <RecipeCard 
                        key={recipe.id} 
                        recipe={recipe} 
                        isOpen={openRecipes.includes(recipe.id)}
                        onToggle={() => toggleRecipe(recipe.id)}
                      />
                    ))}
                  </div>
                  
                  <p className="text-center text-2xl mt-8">🍴 Bom apetite!</p>
                </div>
              </TabsContent>

              {/* Dinner Tab */}
              <TabsContent value="dinner">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="font-serif text-3xl lg:text-4xl font-bold text-foreground mb-4">
                      🌙 {dinnerIntro.title}
                    </h2>
                    <p className="text-lg text-muted-foreground mb-4">
                      {dinnerIntro.description}
                    </p>
                    <p className="text-sm text-accent bg-accent/10 inline-block px-4 py-2 rounded-lg">
                      ✨ {dinnerIntro.tip}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {dinnerRecipes.map(recipe => (
                      <RecipeCard 
                        key={recipe.id} 
                        recipe={recipe} 
                        isOpen={openRecipes.includes(recipe.id)}
                        onToggle={() => toggleRecipe(recipe.id)}
                      />
                    ))}
                  </div>
                  
                  <p className="text-center text-2xl mt-8">🌙 Bom apetite!</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-secondary">
          <div className="container-species text-center">
            <h2 className="font-serif text-2xl lg:text-3xl font-bold text-foreground mb-4">
              Quer preparar essas receitas?
            </h2>
            <p className="text-muted-foreground mb-6">
              Confira nossos temperos premium para criar pratos incríveis!
            </p>
            <Button variant="default" size="lg" asChild>
              <a href="/#produtos">Ver Temperos Species</a>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Recipes;