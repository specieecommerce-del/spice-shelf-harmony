import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MessageCircle, Phone, Mail, Package, CreditCard, Truck, RefreshCw } from "lucide-react";
import { useState } from "react";

const HelpCenter = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    {
      icon: Package,
      title: "Pedidos",
      description: "Dúvidas sobre seus pedidos",
    },
    {
      icon: Truck,
      title: "Entregas",
      description: "Rastreamento e prazos",
    },
    {
      icon: CreditCard,
      title: "Pagamentos",
      description: "Formas de pagamento",
    },
    {
      icon: RefreshCw,
      title: "Trocas",
      description: "Política de trocas",
    },
  ];

  const faqs = [
    {
      question: "Como faço para rastrear meu pedido?",
      answer: "Após a confirmação do pagamento, você receberá um e-mail com o código de rastreamento. Você também pode acompanhar seu pedido na página 'Meus Pedidos' ou em nossa página de rastreamento.",
    },
    {
      question: "Qual o prazo de entrega?",
      answer: "O prazo de entrega varia de acordo com sua região. Para a Grande São Paulo, o prazo é de 1 a 3 dias úteis. Para outras regiões, de 3 a 10 dias úteis. O prazo começa a contar após a confirmação do pagamento.",
    },
    {
      question: "Quais são as formas de pagamento aceitas?",
      answer: "Aceitamos PIX, cartões de crédito (Visa, Mastercard, Elo, American Express), cartões de débito e boleto bancário. Parcelamos em até 12x sem juros para compras acima de R$ 100.",
    },
    {
      question: "Como funciona a política de trocas e devoluções?",
      answer: "Você tem até 7 dias após o recebimento para solicitar troca ou devolução. O produto deve estar lacrado e em perfeitas condições. Acesse nossa página de Trocas e Devoluções para mais detalhes.",
    },
    {
      question: "Os produtos são orgânicos?",
      answer: "Trabalhamos com uma seleção de produtos orgânicos e convencionais. Os produtos orgânicos são identificados com o selo 'Orgânico' na página do produto.",
    },
    {
      question: "Como armazenar os temperos corretamente?",
      answer: "Recomendamos armazenar em local fresco, seco e ao abrigo da luz solar. Mantenha os potes bem fechados para preservar o aroma e sabor por mais tempo.",
    },
    {
      question: "Vocês fazem entregas para todo o Brasil?",
      answer: "Sim! Entregamos para todo o território nacional. Para compras acima de R$ 150, o frete é grátis para qualquer região do Brasil.",
    },
    {
      question: "Como entro em contato com o suporte?",
      answer: "Você pode entrar em contato conosco pelo WhatsApp (11) 91977-8073, e-mail specieecommerce@gmail.com ou através do formulário de contato em nosso site.",
    },
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-32 pb-16">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-spice-cream to-background py-16">
          <div className="container-species text-center">
            <h1 className="font-serif text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Central de Ajuda
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              Encontre respostas para suas dúvidas ou entre em contato conosco
            </p>
            
            {/* Search */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                type="text"
                placeholder="Buscar dúvidas..."
                className="pl-12 h-14 text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-12">
          <div className="container-species">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((category) => (
                <div
                  key={category.title}
                  className="bg-card rounded-xl p-6 text-center hover:shadow-lg transition-shadow cursor-pointer border"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <category.icon className="text-primary" size={24} />
                  </div>
                  <h3 className="font-semibold text-foreground">{category.title}</h3>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12">
          <div className="container-species max-w-3xl">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-8 text-center">
              Perguntas Frequentes
            </h2>
            
            <Accordion type="single" collapsible className="space-y-4">
              {filteredFaqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-card rounded-lg border px-6"
                >
                  <AccordionTrigger className="text-left font-medium">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {filteredFaqs.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma pergunta encontrada para "{searchQuery}"
              </p>
            )}
          </div>
        </section>

        {/* Contact */}
        <section className="py-12 bg-spice-cream">
          <div className="container-species">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-8 text-center">
              Ainda precisa de ajuda?
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <a
                href="https://wa.me/5511919778073"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-card rounded-xl p-6 text-center hover:shadow-lg transition-shadow border"
              >
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="text-green-600" size={24} />
                </div>
                <h3 className="font-semibold text-foreground mb-1">WhatsApp</h3>
                <p className="text-sm text-muted-foreground">(11) 91977-8073</p>
              </a>

              <a
                href="tel:+5511919778073"
                className="bg-card rounded-xl p-6 text-center hover:shadow-lg transition-shadow border"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Phone className="text-primary" size={24} />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Telefone</h3>
                <p className="text-sm text-muted-foreground">(11) 91977-8073</p>
              </a>

              <a
                href="mailto:specieecommerce@gmail.com"
                className="bg-card rounded-xl p-6 text-center hover:shadow-lg transition-shadow border"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Mail className="text-primary" size={24} />
                </div>
                <h3 className="font-semibold text-foreground mb-1">E-mail</h3>
                <p className="text-sm text-muted-foreground">specieecommerce@gmail.com</p>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HelpCenter;
