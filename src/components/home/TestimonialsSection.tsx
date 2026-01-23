import { useState, useEffect } from "react";
import { Star, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Testimonial {
  id: string;
  name: string;
  location: string | null;
  rating: number;
  text: string;
  avatar_url: string | null;
}

const TestimonialsSection = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTestimonials();
  }, []);

  const loadTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .limit(3);

      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error("Error loading testimonials:", error);
      setTestimonials([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // Loading skeleton
  if (isLoading || testimonials === null) {
    return (
      <section className="py-16 lg:py-24 bg-background">
        <div className="container-species">
          <div className="text-center mb-12">
            <div className="h-8 w-32 bg-muted rounded-full mx-auto mb-4 animate-pulse" />
            <div className="h-10 w-80 bg-muted rounded mx-auto mb-4 animate-pulse" />
            <div className="h-6 w-64 bg-muted rounded mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card p-8 rounded-2xl animate-pulse">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <div key={s} className="h-4 w-4 bg-muted rounded" />
                  ))}
                </div>
                <div className="h-20 bg-muted rounded mb-6" />
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div>
                    <div className="h-4 w-24 bg-muted rounded mb-1" />
                    <div className="h-3 w-20 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Empty state - don't show section if no testimonials
  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container-species">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 bg-spice-gold/10 rounded-full text-spice-gold font-medium text-sm mb-4">
            💬 Depoimentos
          </span>
          <h2 className="font-serif text-3xl lg:text-4xl font-bold text-foreground mb-4">
            O Que Nossos Clientes Dizem
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Mais de 5.000 clientes satisfeitos em todo o Brasil
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-card p-8 rounded-2xl shadow-card hover:shadow-elevated transition-shadow relative"
            >
              {/* Quote icon */}
              <Quote className="absolute top-6 right-6 w-10 h-10 text-primary/10" />

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className="fill-spice-gold text-spice-gold"
                  />
                ))}
              </div>

              {/* Text */}
              <p className="text-foreground mb-6 leading-relaxed">
                "{testimonial.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                {testimonial.avatar_url ? (
                  <img
                    src={testimonial.avatar_url}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                    {getInitials(testimonial.name)}
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-foreground">
                    {testimonial.name}
                  </h4>
                  {testimonial.location && (
                    <p className="text-sm text-muted-foreground">
                      {testimonial.location}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-16 flex flex-wrap justify-center items-center gap-8 opacity-60">
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">+5.000</div>
            <div className="text-sm text-muted-foreground">Clientes felizes</div>
          </div>
          <div className="w-px h-12 bg-border hidden sm:block" />
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">4.9/5</div>
            <div className="text-sm text-muted-foreground">Avaliação média</div>
          </div>
          <div className="w-px h-12 bg-border hidden sm:block" />
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">99%</div>
            <div className="text-sm text-muted-foreground">Recomendam</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
