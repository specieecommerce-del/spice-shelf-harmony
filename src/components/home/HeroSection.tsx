import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-spices.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center pt-32">
      {/* Background image with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-hero" />
      </div>

      {/* Content */}
      <div className="container-species relative z-10">
        <div className="max-w-2xl text-spice-warm-white">
          <span className="inline-block px-4 py-2 bg-spice-gold/20 backdrop-blur-sm rounded-full text-spice-gold font-medium text-sm mb-6 animate-fade-in">
            ✨ Temperos Premium & Artesanais
          </span>

          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 animate-slide-up">
            Receitas incríveis
            <br />
            <span className="text-gradient-gold">começam aqui</span>
          </h1>

          <p className="text-lg md:text-xl text-spice-cream/90 mb-8 max-w-lg animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Descubra nossa seleção de temperos, ervas e especiarias artesanais
            que transformam qualquer prato em uma experiência gastronômica única.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Button variant="hero" size="xl">
              Compre Agora
            </Button>
            <Button variant="heroOutline" size="xl">
              Ver Receitas
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap items-center gap-6 text-spice-cream/80 text-sm animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center gap-2">
              <span className="text-xl">🚚</span>
              <span>Frete Grátis +R$150</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔒</span>
              <span>Pagamento Seguro</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <span>+5000 Clientes Felizes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative floating elements */}
      <div className="absolute bottom-20 right-10 hidden lg:block animate-float">
        <div className="w-24 h-24 rounded-full bg-spice-gold/20 backdrop-blur-sm" />
      </div>
      <div className="absolute top-40 right-20 hidden lg:block animate-float" style={{ animationDelay: "1s" }}>
        <div className="w-16 h-16 rounded-full bg-spice-warm-white/10 backdrop-blur-sm" />
      </div>
    </section>
  );
};

export default HeroSection;
