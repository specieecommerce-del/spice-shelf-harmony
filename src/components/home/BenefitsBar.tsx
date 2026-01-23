import { useState, useEffect } from "react";
import { Truck, Shield, CreditCard, RefreshCw, LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Benefit {
  icon: string;
  title: string;
  description: string;
}

interface BenefitsContent {
  benefits?: Benefit[];
}

const iconMap: Record<string, LucideIcon> = {
  Truck,
  Shield,
  CreditCard,
  RefreshCw,
};

const defaultBenefits: Benefit[] = [
  { icon: "Truck", title: "Frete Grátis", description: "Em compras acima de R$150" },
  { icon: "Shield", title: "Pagamento Seguro", description: "PIX, Cartão e Boleto" },
  { icon: "CreditCard", title: "Cashback", description: "Ganhe pontos a cada compra" },
  { icon: "RefreshCw", title: "Troca Garantida", description: "Até 30 dias após a compra" },
];

const BenefitsBar = () => {
  const [benefits, setBenefits] = useState<Benefit[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBenefits();
  }, []);

  const loadBenefits = async () => {
    try {
      const { data } = await supabase
        .from("site_content")
        .select("content")
        .eq("section", "benefits_bar")
        .single();

      if (data?.content) {
        const content = data.content as BenefitsContent;
        setBenefits(content.benefits || defaultBenefits);
      } else {
        setBenefits(defaultBenefits);
      }
    } catch (error) {
      setBenefits(defaultBenefits);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading skeleton
  if (isLoading || benefits === null) {
    return (
      <section className="bg-secondary py-8 border-y border-border">
        <div className="container-species">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 justify-center lg:justify-start animate-pulse">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-muted" />
                <div>
                  <div className="h-4 w-24 bg-muted rounded mb-1" />
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-secondary py-8 border-y border-border">
      <div className="container-species">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => {
            const IconComponent = iconMap[benefit.icon] || Truck;
            return (
              <div
                key={index}
                className="flex items-center gap-4 justify-center lg:justify-start"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm lg:text-base">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground text-xs lg:text-sm">
                    {benefit.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BenefitsBar;
