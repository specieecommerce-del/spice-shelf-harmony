import { Truck, Shield, CreditCard, RefreshCw } from "lucide-react";

const benefits = [
  {
    icon: Truck,
    title: "Frete Grátis",
    description: "Em compras acima de R$150",
  },
  {
    icon: Shield,
    title: "Pagamento Seguro",
    description: "PIX, Cartão e Boleto",
  },
  {
    icon: CreditCard,
    title: "Cashback",
    description: "Ganhe pontos a cada compra",
  },
  {
    icon: RefreshCw,
    title: "Troca Garantida",
    description: "Até 30 dias após a compra",
  },
];

const BenefitsBar = () => {
  return (
    <section className="bg-secondary py-8 border-y border-border">
      <div className="container-species">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="flex items-center gap-4 justify-center lg:justify-start"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <benefit.icon className="w-6 h-6 text-primary" />
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
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsBar;
