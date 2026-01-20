import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Shield } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-32 pb-16">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-spice-cream to-background py-16">
          <div className="container-species text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Shield className="text-primary" size={32} />
            </div>
            <h1 className="font-serif text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Política de Privacidade
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
                    1. Introdução
                  </h2>
                  <p className="text-muted-foreground">
                    A Species ("nós", "nosso" ou "empresa") está comprometida em proteger sua privacidade. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais quando você utiliza nosso site e serviços.
                  </p>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    2. Informações que Coletamos
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Coletamos os seguintes tipos de informações:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li><strong>Dados de identificação:</strong> nome completo, CPF/CNPJ, e-mail, telefone</li>
                    <li><strong>Dados de entrega:</strong> endereço completo, CEP, cidade, estado</li>
                    <li><strong>Dados de pagamento:</strong> informações do cartão (processadas por gateway seguro)</li>
                    <li><strong>Dados de navegação:</strong> cookies, IP, páginas visitadas, tempo de acesso</li>
                    <li><strong>Dados de compra:</strong> histórico de pedidos, preferências de produtos</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    3. Como Usamos suas Informações
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Utilizamos suas informações para:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Processar e entregar seus pedidos</li>
                    <li>Enviar confirmações de pedido e atualizações de entrega</li>
                    <li>Responder suas dúvidas e solicitações de suporte</li>
                    <li>Enviar comunicações de marketing (com seu consentimento)</li>
                    <li>Melhorar nossos produtos e serviços</li>
                    <li>Prevenir fraudes e garantir a segurança da plataforma</li>
                    <li>Cumprir obrigações legais e regulatórias</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    4. Compartilhamento de Dados
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Podemos compartilhar suas informações com:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li><strong>Operadores de pagamento:</strong> para processar transações de forma segura</li>
                    <li><strong>Transportadoras:</strong> para realizar a entrega dos produtos</li>
                    <li><strong>Prestadores de serviços:</strong> que nos auxiliam na operação do negócio</li>
                    <li><strong>Autoridades legais:</strong> quando exigido por lei ou ordem judicial</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para fins de marketing.
                  </p>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    5. Segurança dos Dados
                  </h2>
                  <p className="text-muted-foreground">
                    Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações, incluindo:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
                    <li>Criptografia SSL/TLS em todas as transmissões de dados</li>
                    <li>Armazenamento seguro com acesso restrito</li>
                    <li>Monitoramento contínuo de ameaças</li>
                    <li>Políticas internas de acesso a dados</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    6. Seus Direitos
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Acessar seus dados pessoais</li>
                    <li>Corrigir dados incompletos ou desatualizados</li>
                    <li>Solicitar a exclusão de seus dados</li>
                    <li>Revogar o consentimento para uso de dados</li>
                    <li>Solicitar a portabilidade dos dados</li>
                    <li>Obter informações sobre o compartilhamento de dados</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    7. Cookies
                  </h2>
                  <p className="text-muted-foreground">
                    Utilizamos cookies e tecnologias similares para melhorar sua experiência de navegação, lembrar suas preferências e analisar o tráfego do site. Você pode gerenciar as configurações de cookies no seu navegador.
                  </p>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    8. Retenção de Dados
                  </h2>
                  <p className="text-muted-foreground">
                    Mantemos suas informações pessoais pelo tempo necessário para cumprir as finalidades descritas nesta política, a menos que um período de retenção mais longo seja exigido ou permitido por lei (como obrigações fiscais e legais).
                  </p>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    9. Alterações na Política
                  </h2>
                  <p className="text-muted-foreground">
                    Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre quaisquer alterações significativas por e-mail ou através de um aviso em nosso site.
                  </p>
                </section>

                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                    10. Contato
                  </h2>
                  <p className="text-muted-foreground">
                    Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato:
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

export default PrivacyPolicy;
