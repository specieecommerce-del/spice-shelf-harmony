import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { toast } from "sonner";
import { 
  ShoppingCart, 
  Heart, 
  Star, 
  Minus, 
  Plus, 
  Truck, 
  Shield, 
  RefreshCw,
  ChevronLeft,
  Loader2,
  Info,
  ChefHat
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  long_description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  additional_images: string[] | null;
  rating: number | null;
  reviews: number | null;
  badges: string[] | null;
  category: string | null;
  stock_quantity: number | null;
  nutritional_info: Record<string, string> | null;
  is_bestseller: boolean | null;
  is_featured: boolean | null;
  weight: number | null;
}

interface Variation {
  id: string;
  name: string;
  variation_type: string;
  price_adjustment: number;
  stock_quantity: number;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState<Variation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        // Use products_public view to avoid exposing sensitive pricing data
        const [productRes, variationsRes] = await Promise.all([
          supabase.from("products_public").select("*").eq("id", id).maybeSingle(),
          supabase.from("product_variations").select("*").eq("product_id", id).eq("is_active", true),
        ]);

        if (productRes.error) throw productRes.error;
        if (!productRes.data) {
          setIsLoading(false);
          return;
        }
        
        const productData = productRes.data as Product;
        setProduct(productData);
        setSelectedImage(productData.image_url || "");
        setVariations(variationsRes.data || []);
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Erro ao carregar produto");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-32 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-32 container-species text-center">
          <h1 className="text-2xl font-bold">Produto não encontrado</h1>
          <Link to="/produtos">
            <Button className="mt-4">Ver todos os produtos</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const allImages = [product.image_url, ...(product.additional_images || [])].filter(Boolean) as string[];
  
  const currentPrice = selectedVariation 
    ? product.price + selectedVariation.price_adjustment 
    : product.price;

  const handleAddToCart = () => {
    const cartProduct = {
      id: parseInt(product.id.slice(0, 8), 16) % 10000,
      name: selectedVariation ? `${product.name} - ${selectedVariation.name}` : product.name,
      description: product.description || "",
      price: currentPrice,
      originalPrice: product.original_price || undefined,
      image: product.image_url || "",
      rating: product.rating || 5,
      reviews: product.reviews || 0,
      badges: product.badges || [],
      category: product.category || "Especiarias",
    };

    for (let i = 0; i < quantity; i++) {
      addToCart(cartProduct);
    }
    
    toast.success(`${product.name} adicionado ao carrinho!`, {
      description: `${quantity}x R$ ${currentPrice.toFixed(2).replace(".", ",")}`,
    });
  };

  const handleToggleFavorite = () => {
    const productId = parseInt(product.id.slice(0, 8), 16) % 10000;
    toggleFavorite(productId);
    if (!isFavorite(productId)) {
      toast.success(`${product.name} adicionado aos favoritos!`);
    }
  };

  const productId = parseInt(product.id.slice(0, 8), 16) % 10000;

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
            {product.category && (
              <>
                <span>/</span>
                <Link to={`/categoria/${product.category}`} className="hover:text-primary">
                  {product.category}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-foreground">{product.name}</span>
          </nav>

          {/* Back Button */}
          <Link to="/produtos" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6">
            <ChevronLeft className="h-4 w-4" />
            Voltar para produtos
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Images Section */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
                <img
                  src={selectedImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                
                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  {product.badges?.map((badge, index) => (
                    <Badge key={index} variant={badge === "Oferta" ? "destructive" : "secondary"}>
                      {badge}
                    </Badge>
                  ))}
                  {product.is_bestseller && (
                    <Badge variant="secondary">Best-Seller</Badge>
                  )}
                </div>

                {/* Favorite Button */}
                <button
                  onClick={handleToggleFavorite}
                  className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center ${
                    isFavorite(productId) 
                      ? "bg-primary/20 ring-2 ring-primary" 
                      : "bg-white/90"
                  }`}
                >
                  <Heart
                    className={isFavorite(productId) ? "fill-primary text-primary" : "text-muted-foreground"}
                  />
                </button>
              </div>

              {/* Thumbnail Images */}
              {allImages.length > 1 && (
                <div className="flex gap-3 overflow-x-auto">
                  {allImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(img)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedImage === img ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info Section */}
            <div className="space-y-6">
              {/* Category */}
              {product.category && (
                <span className="text-sm text-muted-foreground uppercase tracking-wide">
                  {product.category}
                </span>
              )}

              {/* Title */}
              <h1 className="font-serif text-3xl lg:text-4xl font-bold text-foreground">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={18}
                      className={
                        star <= (product.rating || 5)
                          ? "fill-spice-gold text-spice-gold"
                          : "text-muted-foreground"
                      }
                    />
                  ))}
                </div>
                <span className="font-medium">{product.rating || 5}</span>
                <span className="text-muted-foreground">
                  ({product.reviews || 0} avaliações)
                </span>
              </div>

              {/* Price */}
              <div className="space-y-1">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-primary">
                    R$ {currentPrice.toFixed(2).replace(".", ",")}
                  </span>
                  {product.original_price && product.original_price > currentPrice && (
                    <span className="text-lg text-muted-foreground line-through">
                      R$ {product.original_price.toFixed(2).replace(".", ",")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  ou 3x de R$ {(currentPrice / 3).toFixed(2).replace(".", ",")} sem juros
                </p>
              </div>

              {/* Short Description */}
              {product.short_description && (
                <p className="text-muted-foreground">{product.short_description}</p>
              )}

              {/* Variations */}
              {variations.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Variações</Label>
                  <div className="flex flex-wrap gap-2">
                    {variations.map((variation) => (
                      <button
                        key={variation.id}
                        onClick={() => setSelectedVariation(
                          selectedVariation?.id === variation.id ? null : variation
                        )}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          selectedVariation?.id === variation.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary"
                        }`}
                      >
                        {variation.name}
                        {variation.price_adjustment !== 0 && (
                          <span className="ml-1 text-sm">
                            {variation.price_adjustment > 0 ? "+" : ""}
                            R$ {variation.price_adjustment.toFixed(2)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Quantidade</Label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-3 hover:bg-muted transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-3 hover:bg-muted transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {(product.stock_quantity ?? 0) > 0 
                      ? `${product.stock_quantity} em estoque`
                      : "Sem estoque"}
                  </span>
                </div>
              </div>

              {/* Add to Cart */}
              <div className="flex gap-4">
                <Button 
                  variant="hero" 
                  size="xl" 
                  className="flex-1"
                  onClick={handleAddToCart}
                  disabled={(product.stock_quantity ?? 0) === 0}
                >
                  <ShoppingCart className="mr-2" />
                  Adicionar ao Carrinho
                </Button>
                <Button variant="outline" size="xl" onClick={handleToggleFavorite}>
                  <Heart className={isFavorite(productId) ? "fill-primary text-primary" : ""} />
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t">
                <div className="flex flex-col items-center text-center gap-2">
                  <Truck className="h-6 w-6 text-primary" />
                  <span className="text-xs text-muted-foreground">Frete Grátis +R$150</span>
                </div>
                <div className="flex flex-col items-center text-center gap-2">
                  <Shield className="h-6 w-6 text-primary" />
                  <span className="text-xs text-muted-foreground">Compra Segura</span>
                </div>
                <div className="flex flex-col items-center text-center gap-2">
                  <RefreshCw className="h-6 w-6 text-primary" />
                  <span className="text-xs text-muted-foreground">Troca Fácil</span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details Tabs */}
          <Tabs defaultValue="description" className="mt-16">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="description" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Descrição
              </TabsTrigger>
              <TabsTrigger value="nutritional" className="flex items-center gap-2">
                <ChefHat className="h-4 w-4" />
                Informações Nutricionais
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-6">
              <div className="prose prose-stone max-w-none">
                <p>{product.long_description || product.description || "Sem descrição disponível."}</p>
                {product.weight && (
                  <p className="text-muted-foreground">Peso: {product.weight}g</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="nutritional" className="mt-6">
              {product.nutritional_info && Object.keys(product.nutritional_info).length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(product.nutritional_info).map(([key, value]) => (
                    <div key={key} className="bg-muted/50 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">{key}</div>
                      <div className="font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Informações nutricionais não disponíveis.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`block ${className}`}>{children}</span>
);

export default ProductDetail;
