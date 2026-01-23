import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import heroSpicesBg from "@/assets/hero-spices-bg.jpg";

interface HeroContent {
  background_image?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  cta_text?: string;
  cta_link?: string;
  secondary_cta_text?: string;
  secondary_cta_link?: string;
  badge_text?: string;
  badge_enabled?: boolean;
  trust_badge_1_icon?: string;
  trust_badge_1_text?: string;
  trust_badge_2_icon?: string;
  trust_badge_2_text?: string;
  trust_badge_3_icon?: string;
  trust_badge_3_text?: string;
  show_trust_badges?: boolean;
  overlay_color?: string;
  overlay_opacity?: number;
}

const defaultContent: HeroContent = {
  title: "Receitas incríveis",
  subtitle: "começam aqui",
  description: "Descubra nossa seleção de temperos, ervas e especiarias artesanais que transformam qualquer prato em uma experiência gastronômica única.",
  cta_text: "Compre Agora",
  cta_link: "/produtos",
  secondary_cta_text: "Ver Receitas",
  secondary_cta_link: "/receitas",
  badge_text: "✨ Temperos Premium & Artesanais",
  badge_enabled: true,
  trust_badge_1_icon: "🚚",
  trust_badge_1_text: "Frete Grátis +R$150",
  trust_badge_2_icon: "🔒",
  trust_badge_2_text: "Pagamento Seguro",
  trust_badge_3_icon: "⭐",
  trust_badge_3_text: "+5000 Clientes Felizes",
  show_trust_badges: true,
  overlay_color: "spice-cream",
  overlay_opacity: 60,
};

const HeroSection = () => {
  const [heroContent, setHeroContent] = useState<HeroContent>(defaultContent);
  const [backgroundImage, setBackgroundImage] = useState<string>(heroSpicesBg);

  useEffect(() => {
    loadHeroContent();
  }, []);

  const loadHeroContent = async () => {
    try {
      const { data } = await supabase
        .from("site_content")
        .select("content")
        .eq("section", "hero")
        .single();

      if (data?.content) {
        const content = data.content as HeroContent;
        setHeroContent({ ...defaultContent, ...content });
        if (content.background_image) {
          setBackgroundImage(content.background_image);
        }
      }
    } catch (error) {
      console.log("Using default hero content");
    }
  };

  const overlayOpacity = heroContent.overlay_opacity ?? 60;

  return (
    <section className="relative min-h-[85vh] flex items-center pt-32">
      {/* Background with spices */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div 
          className="absolute inset-0" 
          style={{ 
            backgroundColor: `hsl(var(--spice-cream) / ${overlayOpacity / 100})` 
          }} 
        />
      </div>

      {/* Content */}
      <div className="container-species relative z-10">
        <div className="max-w-2xl text-foreground">
          {heroContent.badge_enabled !== false && heroContent.badge_text && (
            <span className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary font-medium text-sm mb-6 animate-fade-in">
              {heroContent.badge_text}
            </span>
          )}

          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 animate-slide-up">
            {heroContent.title}
            <br />
            <span className="text-primary">{heroContent.subtitle}</span>
          </h1>

          {heroContent.description && (
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg animate-slide-up" style={{ animationDelay: "0.1s" }}>
              {heroContent.description}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            {heroContent.cta_text && (
              <Link to={heroContent.cta_link || "/produtos"}>
                <Button variant="default" size="xl">
                  {heroContent.cta_text}
                </Button>
              </Link>
            )}
            {heroContent.secondary_cta_text && (
              <Link to={heroContent.secondary_cta_link || "/receitas"}>
                <Button variant="outline" size="xl">
                  {heroContent.secondary_cta_text}
                </Button>
              </Link>
            )}
          </div>

          {/* Trust badges */}
          {heroContent.show_trust_badges !== false && (
            <div className="mt-12 flex flex-wrap items-center gap-6 text-muted-foreground text-sm animate-fade-in" style={{ animationDelay: "0.3s" }}>
              {heroContent.trust_badge_1_text && (
                <div className="flex items-center gap-2">
                  <span className="text-xl">{heroContent.trust_badge_1_icon}</span>
                  <span>{heroContent.trust_badge_1_text}</span>
                </div>
              )}
              {heroContent.trust_badge_2_text && (
                <div className="flex items-center gap-2">
                  <span className="text-xl">{heroContent.trust_badge_2_icon}</span>
                  <span>{heroContent.trust_badge_2_text}</span>
                </div>
              )}
              {heroContent.trust_badge_3_text && (
                <div className="flex items-center gap-2">
                  <span className="text-xl">{heroContent.trust_badge_3_icon}</span>
                  <span>{heroContent.trust_badge_3_text}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </section>
  );
};

export default HeroSection;
