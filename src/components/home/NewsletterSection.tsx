import { useState } from "react";
import { Send, Gift, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter signup
    console.log("Newsletter signup:", email);
    setEmail("");
  };

  return (
    <section className="py-16 lg:py-24 bg-gradient-hero relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-spice-gold/10 blur-3xl" />
      <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-spice-warm-white/5 blur-3xl" />

      <div className="container-species relative z-10">
        <div className="max-w-2xl mx-auto text-center text-spice-warm-white">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-spice-gold/20 mb-6">
            <Gift className="w-8 h-8 text-spice-gold" />
          </div>

          {/* Content */}
          <h2 className="font-serif text-3xl lg:text-4xl font-bold mb-4">
            Ganhe 10% de Desconto
          </h2>
          <p className="text-spice-cream/90 text-lg mb-8">
            Inscreva-se em nossa newsletter e receba um cupom exclusivo de 10%
            off + receitas semanais direto no seu e-mail!
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 bg-spice-warm-white/95 border-0 text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
            <Button type="submit" variant="gold" size="lg" className="h-12">
              <Send size={18} />
              Inscrever
            </Button>
          </form>

          {/* Privacy note */}
          <p className="text-spice-cream/60 text-xs mt-4">
            Respeitamos sua privacidade. Cancele a qualquer momento.
          </p>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-spice-cream/80">
            <span className="flex items-center gap-2">
              ✓ Cupom de 10% off
            </span>
            <span className="flex items-center gap-2">
              ✓ Receitas exclusivas
            </span>
            <span className="flex items-center gap-2">
              ✓ Ofertas antecipadas
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;
