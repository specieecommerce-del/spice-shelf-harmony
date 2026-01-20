import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MessageCircle, Phone, Mail, Package, CreditCard, Truck, RefreshCw, Send, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

const contactFormSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
  email: z.string().trim().email("E-mail inválido").max(255, "E-mail muito longo"),
  subject: z.string().min(1, "Selecione um assunto"),
  orderNumber: z.string().optional(),
  message: z.string().trim().min(10, "Mensagem deve ter pelo menos 10 caracteres").max(1000, "Mensagem muito longa"),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

const HelpCenter = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);
  
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Build WhatsApp message with form data
    const message = encodeURIComponent(
      `*Contato via Site*\n\n` +
      `*Nome:* ${data.name}\n` +
      `*E-mail:* ${data.email}\n` +
      `*Assunto:* ${data.subject}\n` +
      `${data.orderNumber ? `*Nº Pedido:* ${data.orderNumber}\n` : ""}` +
      `\n*Mensagem:*\n${data.message}`
    );
    
    // Open WhatsApp with the message
    window.open(`https://wa.me/5511919778073?text=${message}`, "_blank");
    
    setFormSubmitted(true);
    toast.success("Mensagem enviada com sucesso!");
    reset();
    
    // Reset form state after 5 seconds
    setTimeout(() => setFormSubmitted(false), 5000);
  };

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

  const [activeCategory, setActiveCategory] = useState<string>("all");

  const faqCategories = [
    { id: "all", label: "Todas", icon: Search },
    { id: "produtos", label: "Produtos", icon: Package },
    { id: "pedidos", label: "Pedidos", icon: CreditCard },
    { id: "entregas", label: "Entregas", icon: Truck },
  ];

  const faqs = [
    {
      category: "produtos",
      question: "O que torna os temperos da Species diferentes dos outros?",
      answer: "Nossos temperos são feitos com ingredientes selecionados e combinações pensadas para realçar o sabor dos alimentos, sem mascarar o gosto natural. A gente acredita que comida boa começa com tempero de verdade.",
    },
    {
      category: "produtos",
      question: "Os temperos contêm conservantes ou aditivos artificiais?",
      answer: "Não. Trabalhamos com fórmulas limpas, sem conservantes artificiais e sem corantes. Só o que é necessário para garantir sabor, qualidade e segurança.",
    },
    {
      category: "produtos",
      question: "Os produtos possuem glutamato monossódico (MSG)?",
      answer: "Não utilizamos glutamato monossódico em nossos temperos. O sabor vem das especiarias, ervas e ingredientes naturais, não de realçadores artificiais.",
    },
    {
      category: "produtos",
      question: "Os temperos são naturais?",
      answer: "Sim! Nossos produtos são feitos com ingredientes naturais, cuidadosamente selecionados para garantir aroma, sabor e frescor em cada preparo.",
    },
    {
      category: "produtos",
      question: "Quais tipos de pratos posso preparar com os temperos?",
      answer: "Eles são superversáteis! Você pode usar em carnes, frangos, peixes, legumes, arroz, feijão, massas e até em receitas do dia a dia que pedem um toque especial.",
    },
    {
      category: "produtos",
      question: "Como devo usar o tempero para melhor resultado?",
      answer: "Recomendamos usar aos poucos e ajustar ao seu gosto. Comece com uma pequena quantidade, prove e acrescente mais se necessário. Assim você garante equilíbrio e muito sabor.",
    },
    {
      category: "produtos",
      question: "Os temperos possuem muito sódio?",
      answer: "Nos preocupamos com equilíbrio. Nossos temperos têm teor de sódio controlado, permitindo que você tempere sua comida com sabor sem exageros.",
    },
    {
      category: "produtos",
      question: "Os produtos são veganos?",
      answer: "Sim! Nossos temperos não possuem ingredientes de origem animal, sendo uma ótima opção para quem segue uma alimentação vegana ou vegetariana.",
    },
    {
      category: "produtos",
      question: "Qual é a validade dos temperos?",
      answer: "A validade varia conforme o produto, mas geralmente é de até 12 meses. Essa informação está sempre indicada na embalagem para sua segurança.",
    },
    {
      category: "produtos",
      question: "Como devo armazenar os temperos?",
      answer: "Guarde em local seco, fresco e longe da luz. Manter a embalagem bem fechada ajuda a preservar o aroma e o sabor por muito mais tempo.",
    },
    {
      category: "produtos",
      question: "Os produtos possuem alergênicos?",
      answer: "Alguns produtos podem conter ou ter contato com alergênicos. Todas essas informações estão descritas de forma clara no rótulo, seguindo as normas da Anvisa.",
    },
    {
      category: "produtos",
      question: "Posso usar os temperos todos os dias?",
      answer: "Com certeza! Eles foram pensados para facilitar a rotina na cozinha e deixar suas refeições mais saborosas no dia a dia.",
    },
    {
      category: "produtos",
      question: "Onde posso comprar os temperos da Species?",
      answer: "Você pode adquirir nossos produtos diretamente aqui no site ou nos pontos de venda parceiros indicados na página 'Onde Comprar'.",
    },
    {
      category: "produtos",
      question: "Os temperos são produzidos no Brasil?",
      answer: "Sim! Nossos temperos são produzidos no Brasil, valorizando fornecedores locais e mantendo um alto padrão de qualidade.",
    },
    {
      category: "pedidos",
      question: "Como faço para rastrear meu pedido?",
      answer: "Após a confirmação do pagamento, você receberá um e-mail com o código de rastreamento. Você também pode acompanhar seu pedido na página 'Meus Pedidos' ou em nossa página de rastreamento.",
    },
    {
      category: "pedidos",
      question: "Quais são as formas de pagamento aceitas?",
      answer: "Aceitamos PIX, cartões de crédito (Visa, Mastercard, Elo, American Express), cartões de débito e boleto bancário. Parcelamos em até 12x sem juros para compras acima de R$ 100.",
    },
    {
      category: "pedidos",
      question: "Como funciona a política de trocas e devoluções?",
      answer: "Você tem até 7 dias após o recebimento para solicitar troca ou devolução. O produto deve estar lacrado e em perfeitas condições. Acesse nossa página de Trocas e Devoluções para mais detalhes.",
    },
    {
      category: "pedidos",
      question: "Como entro em contato com o suporte?",
      answer: "Você pode entrar em contato conosco pelo WhatsApp (11) 91977-8073, e-mail specieecommerce@gmail.com ou através do formulário de contato em nosso site. Vamos adorar conversar e ajudar você! 🍃",
    },
    {
      category: "entregas",
      question: "Qual o prazo de entrega?",
      answer: "O prazo de entrega varia de acordo com sua região. Para a Grande São Paulo, o prazo é de 1 a 3 dias úteis. Para outras regiões, de 3 a 10 dias úteis. O prazo começa a contar após a confirmação do pagamento.",
    },
    {
      category: "entregas",
      question: "Vocês fazem entregas para todo o Brasil?",
      answer: "Sim! Entregamos para todo o território nacional. Para compras acima de R$ 150, o frete é grátis para qualquer região do Brasil.",
    },
  ];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

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
            <h2 className="font-serif text-2xl font-bold text-foreground mb-6 text-center">
              🌶️ Perguntas Frequentes sobre nossos Temperos
            </h2>
            
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {faqCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-card border hover:bg-muted"
                  }`}
                >
                  <cat.icon size={16} />
                  {cat.label}
                </button>
              ))}
            </div>
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

        {/* Contact Form */}
        <section className="py-12 bg-spice-cream" id="contato">
          <div className="container-species">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-2 text-center">
              Entre em Contato
            </h2>
            <p className="text-muted-foreground text-center mb-8 max-w-lg mx-auto">
              Preencha o formulário abaixo e nossa equipe responderá o mais breve possível
            </p>

            <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
              {/* Form */}
              <div className="bg-card rounded-xl border p-8">
                {formSubmitted ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="text-green-600" size={32} />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Mensagem Enviada!</h3>
                    <p className="text-muted-foreground">
                      Obrigado pelo contato. Responderemos em breve.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome completo *</Label>
                        <Input
                          id="name"
                          placeholder="Seu nome"
                          {...register("name")}
                          className={errors.name ? "border-destructive" : ""}
                        />
                        {errors.name && (
                          <p className="text-sm text-destructive">{errors.name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          {...register("email")}
                          className={errors.email ? "border-destructive" : ""}
                        />
                        {errors.email && (
                          <p className="text-sm text-destructive">{errors.email.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="subject">Assunto *</Label>
                        <Select onValueChange={(value) => setValue("subject", value)}>
                          <SelectTrigger className={errors.subject ? "border-destructive" : ""}>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Dúvida sobre pedido">Dúvida sobre pedido</SelectItem>
                            <SelectItem value="Problemas com entrega">Problemas com entrega</SelectItem>
                            <SelectItem value="Troca ou devolução">Troca ou devolução</SelectItem>
                            <SelectItem value="Pagamento">Pagamento</SelectItem>
                            <SelectItem value="Produtos">Produtos</SelectItem>
                            <SelectItem value="Sugestões">Sugestões</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.subject && (
                          <p className="text-sm text-destructive">{errors.subject.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="orderNumber">Nº do Pedido (opcional)</Label>
                        <Input
                          id="orderNumber"
                          placeholder="Ex: SP-123456"
                          {...register("orderNumber")}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Mensagem *</Label>
                      <Textarea
                        id="message"
                        placeholder="Descreva sua dúvida ou solicitação..."
                        rows={5}
                        {...register("message")}
                        className={errors.message ? "border-destructive" : ""}
                      />
                      {errors.message && (
                        <p className="text-sm text-destructive">{errors.message.message}</p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        "Enviando..."
                      ) : (
                        <>
                          <Send size={18} className="mr-2" />
                          Enviar Mensagem
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </div>

              {/* Contact Info */}
              <div className="space-y-6">
                <h3 className="font-serif text-xl font-bold text-foreground">
                  Outras formas de contato
                </h3>
                <p className="text-muted-foreground">
                  Prefere falar diretamente conosco? Use um dos canais abaixo:
                </p>

                <div className="space-y-4">
                  <a
                    href="https://wa.me/5511919778073"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 bg-card rounded-xl p-4 hover:shadow-lg transition-shadow border"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="text-green-600" size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">WhatsApp</h4>
                      <p className="text-sm text-muted-foreground">(11) 91977-8073</p>
                    </div>
                  </a>

                  <a
                    href="tel:+5511919778073"
                    className="flex items-center gap-4 bg-card rounded-xl p-4 hover:shadow-lg transition-shadow border"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="text-primary" size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Telefone</h4>
                      <p className="text-sm text-muted-foreground">(11) 91977-8073</p>
                    </div>
                  </a>

                  <a
                    href="mailto:specieecommerce@gmail.com"
                    className="flex items-center gap-4 bg-card rounded-xl p-4 hover:shadow-lg transition-shadow border"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="text-primary" size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">E-mail</h4>
                      <p className="text-sm text-muted-foreground">specieecommerce@gmail.com</p>
                    </div>
                  </a>
                </div>

                <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
                  <h4 className="font-semibold text-foreground mb-2">Horário de Atendimento</h4>
                  <p className="text-muted-foreground text-sm">
                    Segunda a Sexta: 9h às 18h<br />
                    Sábado: 9h às 13h<br />
                    Domingo e Feriados: Fechado
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HelpCenter;
