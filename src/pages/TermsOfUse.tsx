import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { FileText } from "lucide-react";

const TermsOfUse = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-32 pb-16">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-spice-cream to-background py-16">
          <div className="container-species text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <FileText className="text-primary" size={32} />
            </div>
            <h1 className="font-serif text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Termos de Uso
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Última atualização: Janeiro de 2025
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="container-species max-w-4xl">
            <div className="prose prose-lg max-w-none">
              <div className="bg-card rounded-xl border p-8 space-y-8">
                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    1. Aceitação dos Termos
                  </h2>
                  <p className="text-muted-foreground">
                    Ao acessar e utilizar o site da Species (www.speciesalimentos.com.br), você concorda com estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não utilize nosso site ou serviços.
                  </p>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    2. Sobre a Species
                  </h2>
                  <p className="text-muted-foreground">
                    A Species é uma loja online especializada na venda de especiarias, temperos, ervas e produtos gourmet. Nosso compromisso é oferecer produtos de alta qualidade para transformar suas experiências gastronômicas.
                  </p>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    3. Uso do Site
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Ao utilizar nosso site, você concorda em:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Fornecer informações verdadeiras, precisas e completas</li>
                    <li>Manter a confidencialidade de sua conta e senha</li>
                    <li>Não utilizar o site para fins ilegais ou não autorizados</li>
                    <li>Não interferir ou prejudicar o funcionamento do site</li>
                    <li>Não copiar ou reproduzir o conteúdo sem autorização</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    4. Cadastro e Conta
                  </h2>
                  <p className="text-muted-foreground">
                    Para realizar compras, você deve criar uma conta fornecendo informações válidas. Você é responsável por manter suas credenciais de acesso seguras e por todas as atividades realizadas em sua conta. Notifique-nos imediatamente caso suspeite de uso não autorizado.
                  </p>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    5. Produtos e Preços
                  </h2>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Os preços são exibidos em Reais (R$) e podem ser alterados sem aviso prévio</li>
                    <li>As imagens dos produtos são ilustrativas e podem variar ligeiramente</li>
                    <li>A disponibilidade dos produtos está sujeita ao estoque</li>
                    <li>Reservamo-nos o direito de corrigir erros de precificação</li>
                    <li>Promoções têm prazo determinado e condições específicas</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    6. Pedidos e Pagamento
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Ao realizar um pedido:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>A confirmação do pedido está sujeita à aprovação do pagamento</li>
                    <li>Reservamo-nos o direito de cancelar pedidos com indícios de fraude</li>
                    <li>O prazo de entrega inicia após a confirmação do pagamento</li>
                    <li>Você receberá e-mails com atualizações sobre seu pedido</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    7. Entrega
                  </h2>
                  <p className="text-muted-foreground">
                    Realizamos entregas para todo o Brasil através de transportadoras parceiras. Os prazos de entrega são estimados e podem variar de acordo com a região e condições logísticas. O frete é calculado no momento da compra com base no CEP de destino.
                  </p>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    8. Trocas e Devoluções
                  </h2>
                  <p className="text-muted-foreground">
                    Nossa política de trocas e devoluções segue o Código de Defesa do Consumidor. Para mais detalhes, consulte nossa página de Trocas e Devoluções.
                  </p>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    9. Propriedade Intelectual
                  </h2>
                  <p className="text-muted-foreground">
                    Todo o conteúdo do site, incluindo textos, imagens, logotipos, design e software, é de propriedade da Species ou de seus licenciadores e está protegido por leis de propriedade intelectual. É proibida a reprodução, distribuição ou uso comercial sem autorização expressa.
                  </p>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    10. Limitação de Responsabilidade
                  </h2>
                  <p className="text-muted-foreground">
                    A Species não se responsabiliza por danos indiretos, incidentais ou consequenciais decorrentes do uso ou impossibilidade de uso do site. Nossa responsabilidade está limitada ao valor do pedido realizado.
                  </p>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    11. Privacidade
                  </h2>
                  <p className="text-muted-foreground">
                    O tratamento de seus dados pessoais é regido por nossa Política de Privacidade, que faz parte integrante destes Termos de Uso.
                  </p>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    12. Alterações nos Termos
                  </h2>
                  <p className="text-muted-foreground">
                    Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. As alterações entram em vigor imediatamente após sua publicação no site. O uso continuado do site após as alterações constitui aceitação dos novos termos.
                  </p>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    13. Lei Aplicável
                  </h2>
                  <p className="text-muted-foreground">
                    Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será submetida ao foro da Comarca de São Paulo, SP.
                  </p>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    14. Contato
                  </h2>
                  <p className="text-muted-foreground">
                    Para dúvidas sobre estes Termos de Uso, entre em contato:
                  </p>
                  <ul className="list-none text-muted-foreground space-y-2 mt-4">
                    <li><strong>E-mail:</strong> specieecommerce@gmail.com</li>
                    <li><strong>Telefone:</strong> (11) 91977-8073</li>
                    <li><strong>Endereço:</strong> Rua Peixoto Gomide 448, São Paulo, SP - 01409-000</li>
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfUse;
