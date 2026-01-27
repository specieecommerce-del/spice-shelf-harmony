import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import productHerbs from "@/assets/product-herbs.jpg";
import productSalt from "@/assets/product-salt.jpg";
import productKit from "@/assets/product-kit.jpg";
import productTurmeric from "@/assets/product-turmeric.jpg";

const fallbackImages: Record<string, string> = {
  "ervas-temperos": productHerbs,
  "sais-especiais": productSalt,
  "kits-presentes": productKit,
  "especiarias": productTurmeric,
};

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  product_count?: number;
}

const CategoriesSection = () => {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      // Fetch categories
      const { data: categoriesData, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(4);

      if (error) throw error;

      // Fetch product counts for each category
      const categoriesWithCounts = await Promise.all(
        (categoriesData || []).map(async (cat) => {
          // Use products_public view to avoid exposing sensitive pricing data
          const { count } = await supabase
            .from("products_public")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true)
            .eq("category_id", cat.id);

          return {
            ...cat,
            product_count: count || 0,
          };
        })
      );

      setCategories(categoriesWithCounts);
    } catch (error) {
      console.error("Error loading categories:", error);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading skeleton
  if (isLoading || categories === null) {
    return (
      <section className="py-16 lg:py-24 bg-background">
        <div className="container-species">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-12">
            <div>
              <div className="h-8 w-32 bg-muted rounded-full mb-4 animate-pulse" />
              <div className="h-10 w-64 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Empty state
  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container-species">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-12">
          <div>
            <span className="inline-block px-4 py-1 bg-spice-forest/10 rounded-full text-spice-forest font-medium text-sm mb-4">
              🌿 Categorias
            </span>
            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-foreground">
              Explore por Categoria
            </h2>
          </div>
          <Link
            to="/produtos"
            className="mt-4 lg:mt-0 inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
          >
            Ver todas
            <ArrowRight size={18} />
          </Link>
        </div>

        {/* Categories grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/categoria/${category.slug}`}
              className="group relative rounded-2xl overflow-hidden aspect-[4/5] cursor-pointer"
            >
              {/* Background image */}
              <img
                src={category.image_url || fallbackImages[category.slug] || productHerbs}
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-spice-brown/90 via-spice-brown/40 to-transparent" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-spice-warm-white">
                <span className="text-sm text-spice-cream/80">
                  {category.product_count} produtos
                </span>
                <h3 className="font-serif text-xl font-bold mt-1 group-hover:text-spice-gold transition-colors">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="text-sm text-spice-cream/80 mt-1">
                    {category.description}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all">
                  <span>Explorar</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
