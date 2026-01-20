// Cart functionality for Species store
import { useState, useEffect } from "react";
import { ShoppingCart, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCart, Product } from "@/contexts/CartContext";
import { toast } from "sonner";

import productHerbs from "@/assets/product-herbs.jpg";
import productSalt from "@/assets/product-salt.jpg";
import productKit from "@/assets/product-kit.jpg";
import productTurmeric from "@/assets/product-turmeric.jpg";

const products: Product[] = [
  {
    id: 1,
    name: "Mix Ervas Provence",
    description: "Blend artesanal de ervas aromáticas",
    price: 34.90,
    originalPrice: 44.90,
    image: productHerbs,
    rating: 4.9,
    reviews: 127,
    badges: ["Best-seller", "Sem Glúten"],
    category: "Ervas",
  },
  {
    id: 2,
    name: "Flor de Sal Premium",
    description: "Sal gourmet com cristais delicados",
    price: 49.90,
    image: productSalt,
    rating: 4.8,
    reviews: 89,
    badges: ["Premium", "Artesanal"],
    category: "Sais",
  },
  {
    id: 3,
    name: "Kit Especiarias Chef",
    description: "6 temperos essenciais para sua cozinha",
    price: 129.90,
    originalPrice: 159.90,
    image: productKit,
    rating: 5.0,
    reviews: 234,
    badges: ["Kit", "Oferta"],
    category: "Kits",
  },
  {
    id: 4,
    name: "Cúrcuma Orgânica",
    description: "Açafrão-da-terra puro e natural",
    price: 29.90,
    image: productTurmeric,
    rating: 4.7,
    reviews: 156,
    badges: ["Orgânico", "Vegan"],
    category: "Especiarias",
  },
];

// Hook to manage favorites in localStorage
const useFavorites = () => {
  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("product_favorites");
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  const toggleFavorite = (productId: number) => {
    setFavorites((prev) => {
      const newFavorites = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      localStorage.setItem("product_favorites", JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  const isFavorite = (productId: number) => favorites.includes(productId);

  return { favorites, toggleFavorite, isFavorite };
};

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
