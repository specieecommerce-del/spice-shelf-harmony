import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { CreditCard, Wallet, BadgeCheck, AlertCircle } from "lucide-react";
import { useEffect } from "react";

const PaymentPolicy = () => {
  useEffect(() => {
    document.title = "Política de Pagamento | Species Alimentos";
    const meta = document.querySelector('meta[name="description"]');
    const content = "PIX, cartão e boleto com segurança. Parcelamento até 12x em compras acima de R$100.";
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
              <CreditCard className="text-primary" size={32} />
            </div>
            <h1 className="font-serif text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Política de Pagamento
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Pagamentos seguros com PIX, cartões e boleto. Parcelamento disponível conforme condições.
            </p>
          </div>
        </section>

        <section className="container-species grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="p-6 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3 mb-3">
                <Wallet className="text-primary" />
                <h2 className="font-semibold text-foreground">Formas Aceitas</h2>
              </div>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>PIX</li>
                <li>Cartões de crédito (Visa, Mastercard, Elo, Amex)</li>
                <li>Cartão de débito</li>
                <li>Boleto bancário (emissão registrada)</li>
              </ul>
            </div>

            <div className="p-6 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3 mb-3">
                <BadgeCheck className="text-primary" />
                <h2 className="font-semibold text-foreground">Segurança</h2>
              </div>
              <p className="text-muted-foreground">
                Transações processadas por provedores confiáveis, com criptografia e conformidade exigida. Nunca armazenamos dados sensíveis de cartão.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="text-primary" />
                <h2 className="font-semibold text-foreground">Parcelamento e Condições</h2>
              </div>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Parcelamento em até 12x sem juros em compras acima de R$100</li>
                <li>Pedidos por boleto são liberados após compensação bancária</li>
                <li>Em caso de divergência, entre em contato com nosso suporte</li>
              </ul>
            </div>

            <div className="p-6 border rounded-lg bg-muted/30">
              <h2 className="font-semibold text-foreground mb-3">Contato</h2>
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

export default PaymentPolicy;
