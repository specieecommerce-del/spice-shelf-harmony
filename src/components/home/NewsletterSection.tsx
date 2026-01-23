import { useState, useEffect } from "react";
import { Send, Gift, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NewsletterContent {
  title?: string;
  description?: string;
  discount_percentage?: number;
  benefits?: string[];
  privacy_note?: string;
  button_text?: string;
}

const defaultContent: NewsletterContent = {
  title: "Ganhe 10% de Desconto",
  description: "Inscreva-se em nossa newsletter e receba um cupom exclusivo de 10% off + receitas semanais direto no seu e-mail!",
  discount_percentage: 10,
  benefits: ["Cupom de 10% off", "Receitas exclusivas", "Ofertas antecipadas"],
  privacy_note: "Respeitamos sua privacidade. Cancele a qualquer momento.",
  button_text: "Inscrever",
};

const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState<NewsletterContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const { data } = await supabase
        .from("site_content")
        .select("content")
        .eq("section", "newsletter")
        .single();

      if (data?.content) {
        setContent({ ...defaultContent, ...data.content as NewsletterContent });
      } else {
        setContent(defaultContent);
      }
    } catch (error) {
      setContent(defaultContent);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      // Here you would typically send to a newsletter service or save to database
      console.log("Newsletter signup:", email);
      toast.success("Inscrição realizada com sucesso! Verifique seu e-mail.");
      setEmail("");
    } catch (error) {
      toast.error("Erro ao realizar inscrição. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading skeleton
  if (isLoading || content === null) {
    return (
      <section className="py-16 lg:py-24 bg-gradient-hero relative overflow-hidden">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-spice-gold/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-spice-warm-white/5 blur-3xl" />
        <div className="container-species relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-spice-gold/20 mx-auto mb-6 animate-pulse" />
            <div className="h-10 w-64 bg-spice-warm-white/20 rounded mx-auto mb-4 animate-pulse" />
            <div className="h-6 w-full max-w-md bg-spice-warm-white/20 rounded mx-auto mb-8 animate-pulse" />
            <div className="flex gap-4 max-w-md mx-auto">
              <div className="h-12 flex-1 bg-spice-warm-white/20 rounded animate-pulse" />
              <div className="h-12 w-32 bg-spice-warm-white/20 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    );
  }

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
            {content.title}
          </h2>
          <p className="text-spice-cream/90 text-lg mb-8">
            {content.description}
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
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" variant="gold" size="lg" className="h-12" disabled={isSubmitting}>
              <Send size={18} />
              {content.button_text}
            </Button>
          </form>

          {/* Privacy note */}
          <p className="text-spice-cream/60 text-xs mt-4">
            {content.privacy_note}
          </p>

          {/* Benefits */}
          {content.benefits && content.benefits.length > 0 && (
            <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-spice-cream/80">
              {content.benefits.map((benefit, index) => (
                <span key={index} className="flex items-center gap-2">
                  ✓ {benefit}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;
