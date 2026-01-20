import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { RefreshCw, Package, Clock, CheckCircle, AlertCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ReturnsPolicy = () => {
  const steps = [
    {
      icon: MessageCircle,
      title: "1. Entre em contato",
      description: "Fale conosco pelo WhatsApp ou e-mail informando o número do pedido e o motivo da troca/devolução.",
    },
    {
      icon: Package,
      title: "2. Prepare o produto",
      description: "Embale o produto com cuidado, preferencialmente na embalagem original, com todos os acessórios.",
    },
    {
      icon: RefreshCw,
      title: "3. Envie o produto",
      description: "Envie o produto pelos Correios usando o código de postagem que forneceremos.",
    },
    {
      icon: CheckCircle,
      title: "4. Receba o reembolso",
      description: "Após análise do produto, processaremos o reembolso ou enviaremos o novo produto.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-32 pb-16">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-spice-cream to-background py-16">
          <div className="container-species text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <RefreshCw className="text-primary" size={32} />
            </div>
            <h1 className="font-serif text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Trocas e Devoluções
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Sua satisfação é nossa prioridade. Confira nossa política de trocas e devoluções.
            </p>
          </div>
        </section>

        {/* Policy Content */}
        <section className="py-12">
          <div className="container-species max-w-4xl">
            {/* Important Notice */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-12">
              <div className="flex items-start gap-4">
                <Clock className="text-primary flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Prazo para solicitar</h3>
                  <p className="text-muted-foreground">
                    Você tem até <strong>7 dias corridos</strong> após o recebimento do produto para solicitar troca ou devolução, conforme o Código de Defesa do Consumidor.
                  </p>
                </div>
              </div>
            </div>

            {/* When you can request */}
            <div className="mb-12">
              <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
                Quando posso solicitar?
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-card rounded-xl border p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="text-green-600" size={24} />
                    <h3 className="font-semibold">Aceito para troca/devolução</h3>
                  </div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Produto diferente do pedido</li>
                    <li>• Produto com defeito de fabricação</li>
                    <li>• Embalagem violada ou danificada</li>
                    <li>• Produto com prazo de validade vencido</li>
                    <li>• Arrependimento (dentro de 7 dias)</li>
                  </ul>
                </div>

                <div className="bg-card rounded-xl border p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="text-destructive" size={24} />
                    <h3 className="font-semibold">Não aceito para troca/devolução</h3>
                  </div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Produto já utilizado ou aberto</li>
                    <li>• Produto sem embalagem original</li>
                    <li>• Produto danificado pelo cliente</li>
                    <li>• Solicitação após 7 dias do recebimento</li>
                    <li>• Produtos em promoção (verificar condições)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* How to request */}
            <div className="mb-12">
              <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
                Como solicitar?
              </h2>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {steps.map((step) => (
                  <div key={step.title} className="text-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <step.icon className="text-primary" size={28} />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Refund Info */}
            <div className="mb-12">
              <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
                Como funciona o reembolso?
              </h2>
              
              <div className="bg-card rounded-xl border p-6 space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Cartão de Crédito</h3>
                  <p className="text-muted-foreground">
                    O estorno será realizado na sua fatura em até 2 faturas subsequentes, dependendo da data de fechamento do seu cartão.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">PIX</h3>
                  <p className="text-muted-foreground">
                    O reembolso será realizado em até 5 dias úteis na mesma chave PIX utilizada para o pagamento.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Boleto Bancário</h3>
                  <p className="text-muted-foreground">
                    O reembolso será realizado via transferência bancária em até 10 dias úteis. Você precisará fornecer seus dados bancários.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-spice-cream rounded-xl p-8 text-center">
              <h3 className="font-serif text-xl font-bold mb-2">Precisa de ajuda?</h3>
              <p className="text-muted-foreground mb-4">
                Entre em contato conosco para iniciar sua solicitação de troca ou devolução
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="forest" asChild>
                  <a href="https://wa.me/5511919778073" target="_blank" rel="noopener noreferrer">
                    Falar no WhatsApp
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="mailto:specieecommerce@gmail.com">
                    Enviar E-mail
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ReturnsPolicy;
