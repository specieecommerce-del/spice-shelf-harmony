// Cart functionality for Species store
import { useState, useEffect } from "react";
import { ShoppingCart, Heart, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCart, Product } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Fallback images
import productHerbs from "@/assets/product-herbs.jpg";
import productSalt from "@/assets/product-salt.jpg";
import productKit from "@/assets/product-kit.jpg";
import productTurmeric from "@/assets/product-turmeric.jpg";

const fallbackImages: Record<string, string> = {
  "Mix Ervas Provence": productHerbs,
  "Flor de Sal Premium": productSalt,
  "Kit Especiarias Chef": productKit,
  "Cúrcuma Orgânica": productTurmeric,
};

interface DBProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  rating: number;
  reviews: number;
  badges: string[];
  category: string | null;
}

const mapDBProductToProduct = (dbProduct: DBProduct, index: number): Product => ({
  id: index + 1,
  name: dbProduct.name,
  description: dbProduct.description || "",
  price: Number(dbProduct.price),
  originalPrice: dbProduct.original_price ? Number(dbProduct.original_price) : undefined,
  image: dbProduct.image_url || fallbackImages[dbProduct.name] || productHerbs,
  rating: Number(dbProduct.rating),
  reviews: dbProduct.reviews,
  badges: dbProduct.badges || [],
  category: dbProduct.category || "Especiarias",
});

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
}

const ProductCard = ({ product, isFavorite, onToggleFavorite }: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart(product);
    toast.success(`${product.name} adicionado ao carrinho!`, {
      description: `R$ ${product.price.toFixed(2).replace(".", ",")}`,
    });
  };

  const handleToggleFavorite = () => {
    onToggleFavorite(product.id);
    if (!isFavorite) {
      toast.success(`${product.name} adicionado aos favoritos!`, {
        icon: "❤️",
      });
    } else {
      toast.info(`${product.name} removido dos favoritos`);
    }
  };

  return (
    <div
      className="group bg-card rounded-xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image container */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-500 ${
            isHovered ? "scale-110" : "scale-100"
          }`}
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1">
          {product.badges.map((badge, index) => (
            <Badge
              key={index}
              variant={badge === "Oferta" ? "destructive" : "secondary"}
              className="text-xs"
            >
              {badge}
            </Badge>
          ))}
        </div>

        {/* Wishlist button */}
        <button
          onClick={handleToggleFavorite}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-all ${
            isFavorite 
              ? "bg-primary/20 ring-2 ring-primary" 
              : "bg-spice-warm-white/90"
          }`}
        >
          <Heart
            size={18}
            className={isFavorite ? "fill-primary text-primary" : "text-muted-foreground"}
          />
        </button>

        {/* Quick add button */}
        <div
          className={`absolute bottom-3 left-3 right-3 transition-all duration-300 ${
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <Button variant="hero" className="w-full" size="sm" onClick={handleAddToCart}>
            <ShoppingCart size={16} />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          {product.category}
        </span>
        <h3 className="font-serif text-lg font-semibold text-foreground mt-1">
          {product.name}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {product.description}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-2">
          <Star size={14} className="fill-spice-gold text-spice-gold" />
          <span className="text-sm font-medium">{product.rating}</span>
          <span className="text-xs text-muted-foreground">
            ({product.reviews} avaliações)
          </span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-xl font-bold text-primary">
            R$ {product.price.toFixed(2).replace(".", ",")}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              R$ {product.originalPrice.toFixed(2).replace(".", ",")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const EmptyFavorites = () => (
  <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
      <Heart size={32} className="text-primary" />
    </div>
    <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
      Nenhum favorito ainda
    </h3>
    <p className="text-muted-foreground max-w-sm">
      Clique no coração ❤️ nos produtos para adicioná-los aos seus favoritos e acessá-los facilmente aqui.
    </p>
  </div>
);

const FeaturedProducts = () => {
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const mappedProducts = data.map((p, i) => mapDBProductToProduct(p as DBProduct, i));
          setProducts(mappedProducts);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const favoriteProducts = products.filter((p) => favorites.includes(p.id));

  return (
    <section className="py-16 lg:py-24 bg-gradient-warm" id="produtos">
      <div className="container-species">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 bg-primary/10 rounded-full text-primary font-medium text-sm mb-4">
            ⭐ Em Destaque
          </span>
          <h2 className="font-serif text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Nossos Best-Sellers
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Os temperos mais amados pelos nossos clientes, selecionados com
            carinho para elevar suas receitas.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="bestsellers" className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="bestsellers" className="flex items-center gap-2">
                <Star size={16} />
                Best-Sellers
              </TabsTrigger>
              <TabsTrigger value="favorites" className="flex items-center gap-2">
                <Heart size={16} />
                Meus Favoritos
                {favorites.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {favorites.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="bestsellers" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isFavorite={isFavorite(product.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {favoriteProducts.length > 0 ? (
                favoriteProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isFavorite={true}
                    onToggleFavorite={toggleFavorite}
                  />
                ))
              ) : (
                <EmptyFavorites />
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* View all button */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            Ver Todos os Produtos
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
