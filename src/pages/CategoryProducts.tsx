import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart, Product } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { toast } from "sonner";
import { ShoppingCart, Heart, Star, Loader2, ChevronLeft, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

const CategoryProducts = () => {
  const { slug } = useParams<{ slug: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState("name");
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;

      setIsLoading(true);
      try {
        // First get the category
        const { data: categoryData, error: categoryError } = await supabase
          .from("product_categories")
          .select("*")
          .eq("slug", slug)
          .single();

        if (categoryError && categoryError.code !== "PGRST116") throw categoryError;
        
        setCategory(categoryData);

        // Use products_public view to avoid exposing sensitive pricing data
        let productsQuery = supabase
          .from("products_public")
          .select("*")
          .eq("is_active", true);

        if (categoryData?.id) {
          productsQuery = productsQuery.eq("category_id", categoryData.id);
        } else {
          // Fallback to matching by category name/slug
          productsQuery = productsQuery.or(`category.ilike.%${slug}%`);
        }

        const { data: productsData, error: productsError } = await productsQuery;
        
        if (productsError) throw productsError;

        const mappedProducts: Product[] = (productsData || []).map((p: DBProduct, i: number) => ({
          id: i + 1,
          dbId: p.id,
          name: p.name,
          description: p.description || "",
          price: Number(p.price),
          originalPrice: p.original_price ? Number(p.original_price) : undefined,
          image: p.image_url || "",
          rating: Number(p.rating || 5),
          reviews: p.reviews || 0,
          badges: p.badges || [],
          category: p.category || slug || "",
        }));

        setProducts(mappedProducts);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Erro ao carregar produtos");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "rating":
        return b.rating - a.rating;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  const handleToggleFavorite = (productId: number, productName: string) => {
    toggleFavorite(productId);
    if (!isFavorite(productId)) {
      toast.success(`${productName} adicionado aos favoritos!`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-28 pb-16">
        <div className="container-species">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link to="/produtos" className="hover:text-primary">Produtos</Link>
            <span>/</span>
            <span className="text-foreground">{category?.name || slug}</span>
          </nav>

          {/* Back Button */}
          <Link to="/produtos" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6">
            <ChevronLeft className="h-4 w-4" />
            Voltar para produtos
          </Link>

          {/* Category Header */}
          {category?.image_url && (
            <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden mb-8">
              <img
                src={category.image_url}
                alt={category.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
                <div className="p-8">
                  <h1 className="font-serif text-3xl md:text-4xl font-bold text-white mb-2">
                    {category.name}
                  </h1>
                  {category.description && (
                    <p className="text-white/80 max-w-md">{category.description}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!category?.image_url && (
            <div className="mb-8">
              <h1 className="font-serif text-3xl font-bold">{category?.name || slug}</h1>
              {category?.description && (
                <p className="text-muted-foreground mt-2">{category.description}</p>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="flex justify-between items-center mb-6">
            <p className="text-muted-foreground">
              {products.length} produto{products.length !== 1 ? "s" : ""} encontrado{products.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nome A-Z</SelectItem>
                  <SelectItem value="price-asc">Menor Preço</SelectItem>
                  <SelectItem value="price-desc">Maior Preço</SelectItem>
                  <SelectItem value="rating">Melhor Avaliação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : sortedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {sortedProducts.map((product) => (
                <div
                  key={product.id}
                  className="group bg-card rounded-xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300"
                >
                  {/* Image container */}
                  <Link to={`/produto/${(product as any).dbId || product.id}`}>
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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
                    </div>
                  </Link>

                  {/* Wishlist button */}
                  <button
                    onClick={() => handleToggleFavorite(product.id, product.name)}
                    className={`absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-all ${
                      isFavorite(product.id)
                        ? "bg-primary/20 ring-2 ring-primary"
                        : "bg-spice-warm-white/90"
                    }`}
                  >
                    <Heart
                      size={18}
                      className={isFavorite(product.id) ? "fill-primary text-primary" : "text-muted-foreground"}
                    />
                  </button>

                  {/* Content */}
                  <div className="p-4">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">
                      {product.category}
                    </span>
                    <h3 className="font-serif text-lg font-semibold text-foreground mt-1">
                      {product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
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

                    {/* Add to cart button */}
                    <Button
                      variant="hero"
                      className="w-full mt-4"
                      size="sm"
                      onClick={() => handleAddToCart(product)}
                    >
                      <ShoppingCart size={16} className="mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                Nenhum produto encontrado nesta categoria.
              </p>
              <Link to="/produtos">
                <Button variant="outline" className="mt-4">
                  Ver todos os produtos
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CategoryProducts;
