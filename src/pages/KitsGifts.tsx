import { useState, useEffect } from "react";
import { Gift, Package, Star, ShoppingCart, Loader2 } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
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
}

const KitsGifts = () => {
  const [kitsGifts, setKitsGifts] = useState<KitGift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    loadKitsGifts();
  }, []);

  const loadKitsGifts = async () => {
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "kits_gifts")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data?.value && Array.isArray(data.value)) {
        const activeItems = (data.value as unknown as KitGift[]).filter(item => item.is_active);
        setKitsGifts(activeItems);
      }
    } catch (err) {
      console.error("Error loading kits/gifts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (item: KitGift) => {
    addToCart({
      id: parseInt(item.id.slice(0, 8), 16),
      name: item.name,
      description: item.description,
      price: item.price,
      originalPrice: item.original_price || undefined,
      image: item.image_url || "/placeholder.svg",
      rating: 5,
      reviews: 0,
      badges: item.is_gift ? ["Presente"] : ["Kit"],
      category: item.is_gift ? "Presentes" : "Kits",
    });
    toast.success(`${item.name} adicionado ao carrinho!`);
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 pb-16">
        <div className="container-species">
          {/* Header da página */}
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1 bg-primary/10 rounded-full text-primary font-medium text-sm mb-4">
              🎁 Especiais
            </span>
            <h1 className="font-serif text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Kits & Presentes
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Conjuntos especiais e opções de presente para quem ama cozinhar ou para presentear quem você ama.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : kitsGifts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Gift size={32} className="text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
                Em breve novos kits!
              </h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Estamos preparando kits e presentes especiais para você. Volte em breve!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {kitsGifts.map((item) => (
                <Card key={item.id} className="overflow-hidden hover:shadow-elevated transition-shadow">
                  <div className="aspect-video relative bg-muted">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10">
                        {item.is_gift ? (
                          <Gift size={48} className="text-primary/40" />
                        ) : (
                          <Package size={48} className="text-primary/40" />
                        )}
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {item.featured && (
                        <Badge className="bg-accent text-accent-foreground">
                          <Star size={12} className="mr-1" />
                          Destaque
                        </Badge>
                      )}
                      {item.is_gift && (
                        <Badge variant="secondary">
                          <Gift size={12} className="mr-1" />
                          Presente
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
                      {item.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {item.description}
                    </p>
                    
                    {item.items_included.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-foreground mb-2">Inclui:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {item.items_included.slice(0, 3).map((included, idx) => (
                            <li key={idx} className="flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-primary" />
                              {included}
                            </li>
                          ))}
                          {item.items_included.length > 3 && (
                            <li className="text-primary text-xs">
                              + {item.items_included.length - 3} itens
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xl font-bold text-primary">
                          {formatPrice(item.price)}
                        </span>
                        {item.original_price && (
                          <span className="text-sm text-muted-foreground line-through ml-2">
                            {formatPrice(item.original_price)}
                          </span>
                        )}
                      </div>
                      <Button size="sm" onClick={() => handleAddToCart(item)}>
                        <ShoppingCart size={16} className="mr-1" />
                        Comprar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default KitsGifts;
