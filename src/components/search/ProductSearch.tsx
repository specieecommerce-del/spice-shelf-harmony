import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, X, Loader2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string | null;
}

interface ProductSearchProps {
  onClose?: () => void;
  className?: string;
  autoFocus?: boolean;
}

const ProductSearch = ({ onClose, className = "", autoFocus = false }: ProductSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const searchProducts = async () => {
      if (query.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        // Normalize query for better matching
        const normalizedQuery = query
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, ""); // Remove accents
        
        // Fetch products with variations
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select(`
            id, name, price, image_url, category, description, short_description,
            product_variations(id, name, variation_type)
          `)
          .eq("is_active", true);

        if (productsError) throw productsError;

        // Smart filtering with fuzzy matching
        const filtered = (productsData || []).filter(product => {
          const normalizeText = (text: string | null) => 
            (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          
          const name = normalizeText(product.name);
          const category = normalizeText(product.category);
          const description = normalizeText(product.description);
          const shortDescription = normalizeText(product.short_description);
          
          // Check variations
          const variations = product.product_variations || [];
          const variationMatch = variations.some((v: any) => 
            normalizeText(v.name).includes(normalizedQuery)
          );
          
          // Split query into words for partial matching
          const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1);
          const allText = `${name} ${category} ${description} ${shortDescription}`;
          
          // Check if any word matches
          const wordMatch = queryWords.some(word => allText.includes(word));
          
          // Direct matches
          const directMatch = 
            name.includes(normalizedQuery) ||
            category.includes(normalizedQuery) ||
            description.includes(normalizedQuery) ||
            shortDescription.includes(normalizedQuery);
          
          return directMatch || wordMatch || variationMatch;
        });

        // Score and sort results by relevance
        const scored = filtered.map(product => {
          const name = product.name.toLowerCase();
          let score = 0;
          if (name === normalizedQuery) score += 100; // Exact match
          if (name.startsWith(normalizedQuery)) score += 50; // Starts with
          if (name.includes(normalizedQuery)) score += 25; // Contains
          return { ...product, score };
        });

        scored.sort((a, b) => b.score - a.score);
        
        setResults(scored.slice(0, 8).map(({ score, product_variations, ...rest }) => rest) as Product[]);
        setIsOpen(true);
      } catch (error) {
        console.error("Error searching products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleProductClick = (productId: string) => {
    setQuery("");
    setIsOpen(false);
    onClose?.();
    navigate(`/produto/${productId}`);
  };

  const handleViewAll = () => {
    setIsOpen(false);
    onClose?.();
    navigate(`/produtos?busca=${encodeURIComponent(query)}`);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Buscar produtos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10 bg-background"
          autoFocus={autoFocus}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="divide-y">
                {results.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <Search className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{product.name}</div>
                      {product.category && (
                        <div className="text-sm text-muted-foreground">{product.category}</div>
                      )}
                    </div>
                    <div className="font-semibold text-primary">
                      R$ {product.price.toFixed(2).replace(".", ",")}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={handleViewAll}
                className="w-full p-3 text-center text-primary font-medium hover:bg-muted/50 transition-colors border-t"
              >
                Ver todos os resultados para "{query}"
              </button>
            </>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              Nenhum produto encontrado para "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSearch;
