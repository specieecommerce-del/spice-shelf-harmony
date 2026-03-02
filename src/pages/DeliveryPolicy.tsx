import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Truck, Clock, MapPin, ShieldCheck, MessageCircle } from "lucide-react";
import { useEffect } from "react";

const DeliveryPolicy = () => {
  useEffect(() => {
    document.title = "Política de Entrega | Species Alimentos";
    const meta = document.querySelector('meta[name="description"]');
    const content = "Entregas rápidas e seguras em todo o Brasil. Frete grátis em compras acima de R$150.";
    if (meta) meta.setAttribute("content", content);
    else {
      const m = document.createElement("meta");
      m.setAttribute("name", "description");
      m.setAttribute("content", content);
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-16">
        <section className="bg-gradient-to-b from-spice-cream to-background py-16">
          <div className="container-species text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Truck className="text-primary" size={32} />
            </div>
            <h1 className="font-serif text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Política de Entrega
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Entregamos para todo o Brasil com parceiros confiáveis. Frete grátis em compras acima de R$150.
            </p>
          </div>
        </section>

        <section className="container-species grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="p-6 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="text-primary" />
                <h2 className="font-semibold text-foreground">Prazos de Entrega</h2>
              </div>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>São Paulo e região: 1–3 dias úteis</li>
                <li>Demais regiões Sudeste: 2–5 dias úteis</li>
                <li>Sul, Centro-Oeste, Nordeste e Norte: 3–10 dias úteis</li>
              </ul>
            </div>

            <div className="p-6 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3 mb-3">
                <ShieldCheck className="text-primary" />
                <h2 className="font-semibold text-foreground">Embalagem Segura</h2>
              </div>
              <p className="text-muted-foreground">
                Produtos embalados cuidadosamente para preservar qualidade e frescor. Em caso de avarias, entre em contato pelo WhatsApp.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="text-primary" />
                <h2 className="font-semibold text-foreground">Rastreamento</h2>
              </div>
              <p className="text-muted-foreground">
                Você recebe o código de rastreio por e-mail após a confirmação do pagamento. Também pode acompanhar em “Rastrear Pedido”.
              </p>
            </div>

            <div className="p-6 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3 mb-3">
                <MessageCircle className="text-primary" />
                <h2 className="font-semibold text-foreground">Suporte</h2>
              </div>
              <ul className="list-none text-muted-foreground space-y-2">
                <li>WhatsApp: (11) 91977-8073</li>
                <li>E-mail: specieecommerce@gmail.com</li>
                <li>Endereço: Rua Peixoto Gomide 448, São Paulo, SP - 01409-000</li>
                <li>CNPJ: 00.000.000/0001-00</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default DeliveryPolicy;
