import { useState, useEffect } from "react";
import { Percent, Tag, Calendar, Loader2 } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

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
}

const Promotions = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "promotions")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data?.value && Array.isArray(data.value)) {
        const activePromos = (data.value as unknown as Promotion[]).filter(p => p.is_active);
        setPromotions(activePromos);
      }
    } catch (err) {
      console.error("Error loading promotions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const isPromoActive = (promo: Promotion) => {
    const now = new Date();
    if (promo.start_date && new Date(promo.start_date) > now) return false;
    if (promo.end_date && new Date(promo.end_date) < now) return false;
    return true;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 pb-16">
        <div className="container-species">
          {/* Header da página */}
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1 bg-accent/20 rounded-full text-accent-foreground font-medium text-sm mb-4">
              🔥 Ofertas Especiais
            </span>
            <h1 className="font-serif text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Promoções
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Aproveite nossas ofertas exclusivas e economize em temperos e especiarias selecionados.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : promotions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Percent size={32} className="text-accent" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
                Novas promoções em breve!
              </h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                Estamos preparando ofertas incríveis para você. Enquanto isso, confira nossos produtos.
              </p>
              <Button asChild>
                <Link to="/produtos">Ver Produtos</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Promoções em destaque */}
              {promotions.filter(p => p.featured).length > 0 && (
                <div className="mb-8">
                  <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                    Em Destaque
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {promotions
                      .filter(p => p.featured)
                      .map((promo) => (
                        <Card key={promo.id} className="overflow-hidden border-2 border-accent/30">
                          {promo.banner_url && (
                            <div className="aspect-[2/1] relative">
                              <img
                                src={promo.banner_url}
                                alt={promo.title}
                                className="w-full h-full object-cover"
                              />
                              {promo.discount_percentage > 0 && (
                                <div className="absolute top-4 right-4 bg-accent text-accent-foreground font-bold px-4 py-2 rounded-full text-lg">
                                  -{promo.discount_percentage}%
                                </div>
                              )}
                            </div>
                          )}
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-serif text-xl font-bold text-foreground mb-2">
                                  {promo.title}
                                </h3>
                                <p className="text-muted-foreground mb-3">
                                  {promo.description}
                                </p>
                                {promo.start_date && promo.end_date && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Calendar size={14} />
                                    {new Date(promo.start_date).toLocaleDateString("pt-BR")} - {new Date(promo.end_date).toLocaleDateString("pt-BR")}
                                  </p>
                                )}
                              </div>
                              {!promo.banner_url && promo.discount_percentage > 0 && (
                                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                                  <span className="text-accent-foreground font-bold text-lg">
                                    {promo.discount_percentage}%
                                  </span>
                                </div>
                              )}
                            </div>
                            <Button className="w-full mt-4" asChild>
                              <Link to="/produtos">Aproveitar Oferta</Link>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}

              {/* Outras promoções */}
              {promotions.filter(p => !p.featured).length > 0 && (
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                    Todas as Promoções
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {promotions
                      .filter(p => !p.featured)
                      .map((promo) => (
                        <Card key={promo.id} className="overflow-hidden hover:shadow-elevated transition-shadow">
                          <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                                {promo.discount_percentage > 0 ? (
                                  <span className="text-primary font-bold text-sm">
                                    {promo.discount_percentage}%
                                  </span>
                                ) : (
                                  <Tag size={20} className="text-primary" />
                                )}
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground">
                                  {promo.title}
                                </h3>
                                {!isPromoActive(promo) && (
                                  <Badge variant="secondary" className="text-xs">
                                    Em breve
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {promo.description || "Aproveite esta oferta especial!"}
                            </p>
                            {promo.start_date && promo.end_date && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                                <Calendar size={12} />
                                {new Date(promo.start_date).toLocaleDateString("pt-BR")} - {new Date(promo.end_date).toLocaleDateString("pt-BR")}
                              </p>
                            )}
                            <Button size="sm" className="w-full" variant="outline" asChild>
                              <Link to="/produtos">Ver Produtos</Link>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Promotions;
