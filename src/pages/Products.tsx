import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShoppingCart, Heart, Star, Eye, Filter, Package, Box } from "lucide-react";
import { useCart, Product } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Fallback images
import productHerbs from "@/assets/product-herbs.jpg";

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

interface ExtendedProduct extends Product {
  dbId: string;
}

interface Category {
  name: string;
  count: number;
  isPackaging: boolean;
}

// Packaging-related categories
const PACKAGING_CATEGORIES = [
  "Tampa de Bambu",
  "Tampa de Madeira", 
  "Tampa de Metal",
  "Tampa de Cortiça",
  "Embalagem de Vidro",
  "Embalagem Plástica",
  "Sachês",
  "Refis",
];

const mapDBProductToProduct = (dbProduct: DBProduct, index: number): ExtendedProduct => ({
  id: index + 1,
  dbId: dbProduct.id,
  name: dbProduct.name,
  description: dbProduct.description || "",
  price: Number(dbProduct.price),
  originalPrice: dbProduct.original_price ? Number(dbProduct.original_price) : undefined,
  image: dbProduct.image_url || productHerbs,
  rating: Number(dbProduct.rating),
  reviews: dbProduct.reviews,
  badges: dbProduct.badges || [],
  category: dbProduct.category || "Especiarias",
});

const ProductCard = ({ product }: { product: ExtendedProduct }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(product.id);

  const handleAddToCart = () => {
    addToCart(product);
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  // Check if this product has a packaging-related badge or category
  const packagingBadge = product.badges.find(b => 
    PACKAGING_CATEGORIES.some(pc => b.toLowerCase().includes(pc.toLowerCase()))
  );

  return (
    <Card
      className="group overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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
          {product.badges.slice(0, 2).map((badge, index) => (
            <Badge
              key={index}
              variant={badge === "Oferta" ? "destructive" : "secondary"}
              className="text-xs"
            >
              {badge}
            </Badge>
          ))}
        </div>

        {/* Packaging Badge */}
        {packagingBadge && (
          <div className="absolute bottom-3 left-3">
            <Badge variant="outline" className="bg-background/80 backdrop-blur-sm gap-1">
              <Box className="h-3 w-3" />
              {packagingBadge}
            </Badge>
          </div>
        )}

        {/* Wishlist button */}
        <button
          onClick={() => {
            toggleFavorite(product.id);
            toast.success(favorite ? "Removido dos favoritos" : "Adicionado aos favoritos");
          }}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-all ${
            favorite 
              ? "bg-primary/20 ring-2 ring-primary" 
              : "bg-background/90"
          }`}
        >
          <Heart
            size={18}
            className={favorite ? "fill-primary text-primary" : "text-muted-foreground"}
          />
        </button>

        {/* Quick add button */}
        <div
          className={`absolute bottom-3 right-3 transition-all duration-300 ${
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <Button variant="hero" size="sm" onClick={handleAddToCart}>
            <ShoppingCart size={16} className="mr-1" />
            Adicionar
          </Button>
        </div>
      </div>

      <CardContent className="p-4">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          {product.category}
        </span>
        <Link to={`/produto/${product.dbId}`}>
          <h3 className="font-serif text-lg font-semibold text-foreground mt-1 hover:text-primary transition-colors cursor-pointer line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-2">
          <Star size={14} className="fill-spice-gold text-spice-gold" />
          <span className="text-sm font-medium">{product.rating}</span>
          <span className="text-xs text-muted-foreground">
            ({product.reviews})
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

        <Link to={`/produto/${product.dbId}`} className="block mt-3">
          <Button variant="outline" size="sm" className="w-full">
            <Eye size={16} className="mr-2" />
            Ver Detalhes
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

const Products = () => {
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPackaging, setSelectedPackaging] = useState<string>("all");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("products_public")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const mappedProducts = data.map((p, i) => mapDBProductToProduct(p as DBProduct, i));
          setProducts(mappedProducts);

          // Extract categories
          const categoryMap = new Map<string, { count: number; isPackaging: boolean }>();
          
          mappedProducts.forEach(p => {
            if (p.category) {
              const isPackaging = PACKAGING_CATEGORIES.some(pc => 
                p.category!.toLowerCase().includes(pc.toLowerCase())
              );
              const existing = categoryMap.get(p.category);
              if (existing) {
                existing.count++;
              } else {
                categoryMap.set(p.category, { count: 1, isPackaging });
              }
            }

            // Also extract packaging categories from badges
            p.badges.forEach(badge => {
              if (PACKAGING_CATEGORIES.some(pc => badge.toLowerCase().includes(pc.toLowerCase()))) {
                const existing = categoryMap.get(badge);
                if (existing) {
                  existing.count++;
                } else {
                  categoryMap.set(badge, { count: 1, isPackaging: true });
                }
              }
            });
          });

          const cats = Array.from(categoryMap.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count);
          
          setCategories(cats);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products
  const filteredProducts = products.filter(p => {
    // Category filter
    if (selectedCategory !== "all" && p.category !== selectedCategory) {
      return false;
    }

    // Packaging filter
    if (selectedPackaging !== "all") {
      const hasPackaging = p.badges.some(b => b === selectedPackaging) || 
                          p.category === selectedPackaging;
      if (!hasPackaging) return false;
    }

    return true;
  });

  // Group products by category
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const category = product.category || "Outros";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, ExtendedProduct[]>);

  const productCategories = categories.filter(c => !c.isPackaging);
  const packagingCategories = categories.filter(c => c.isPackaging);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 pb-16">
        <div className="container-species">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Nossos Produtos
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Explore nossa coleção de temperos e especiarias naturais
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-8 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {productCategories.map(cat => (
                    <SelectItem key={cat.name} value={cat.name}>
                      {cat.name} ({cat.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Box className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedPackaging} onValueChange={setSelectedPackaging}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Embalagem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Embalagens</SelectItem>
                  {packagingCategories.map(cat => (
                    <SelectItem key={cat.name} value={cat.name}>
                      {cat.name} ({cat.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Badge variant="secondary">
              {filteredProducts.length} produto(s)
            </Badge>
          </div>

          {/* Products by Category */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedCategory !== "all" ? (
            // Single category view
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.dbId} product={product} />
              ))}
            </div>
          ) : (
            // Grouped by category view
            <div className="space-y-12">
              {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
                <section key={category}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{category}</h2>
                      <p className="text-sm text-muted-foreground">
                        {categoryProducts.length} produto(s)
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                    >
                      Ver todos
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {categoryProducts.slice(0, 4).map((product) => (
                      <ProductCard key={product.dbId} product={product} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {filteredProducts.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Tente ajustar os filtros para ver mais produtos
              </p>
              <Button onClick={() => { setSelectedCategory("all"); setSelectedPackaging("all"); }}>
                Limpar Filtros
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Products;
