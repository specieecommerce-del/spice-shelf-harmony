import { useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Truck, Leaf, CheckCircle2 } from "lucide-react";

const LocalSeoSP = () => {
  useEffect(() => {
    const title = "Temperos Naturais em São Paulo | Species Alimentos";
    document.title = title;
    const descContent = "Compre temperos naturais e especiarias premium em São Paulo. Entrega rápida e qualidade garantida.";
    let desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!desc) {
      desc = document.createElement("meta");
      desc.setAttribute("name", "description");
      document.head.appendChild(desc);
    }
    desc.setAttribute("content", descContent);
    const canonicalHref = "https://speciesalimentos.com.br/temperos-naturais-sao-paulo";
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalHref);
    const schema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description: descContent,
      inLanguage: "pt-BR",
      url: canonicalHref,
      isPartOf: { "@type": "WebSite", name: "Species Alimentos", url: "https://speciesalimentos.com.br/" },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: "https://speciesalimentos.com.br/" },
          { "@type": "ListItem", position: 2, name: "São Paulo", item: canonicalHref },
        ],
      },
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => {
      if (script && script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24">
        <section className="bg-gradient-to-br from-spice-forest/90 to-spice-forest py-16 text-white">
          <div className="container-species">
            <h1 className="text-3xl md:text-5xl font-bold">
              Temperos Naturais em São Paulo
            </h1>
            <p className="mt-4 text-lg md:text-xl opacity-90 max-w-2xl">
              Especiarias premium com entrega rápida em toda a cidade. Qualidade garantida para elevar o sabor das suas receitas.
            </p>
          </div>
        </section>

        <section className="py-16 bg-background">
          <div className="container-species grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <Leaf className="h-6 w-6 text-spice-forest" />
                  <h2 className="text-xl font-semibold">Seleção Natural</h2>
                </div>
                <p className="text-muted-foreground">
                  Temperos e especiarias selecionados com rigor, frescor e origem confiável para uma cozinha saudável e saborosa.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <Truck className="h-6 w-6 text-accent" />
                  <h2 className="text-xl font-semibold">Entrega Rápida em SP</h2>
                </div>
                <p className="text-muted-foreground">
                  Envio ágil para toda São Paulo, com logística otimizada e acompanhamento do pedido até a sua porta.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle2 className="h-6 w-6 text-spice-gold" />
                  <h2 className="text-xl font-semibold">Qualidade Garantida</h2>
                </div>
                <p className="text-muted-foreground">
                  Padrões elevados de qualidade e satisfação. Prove e comprove o melhor das especiarias premium.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-12 bg-spice-warm-white">
          <div className="container-species grid md:grid-cols-2 gap-8 items-start">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Compra Local em São Paulo</h2>
              <p className="mt-4 text-muted-foreground">
                Atendemos toda São Paulo com variedade de produtos, kits presentes e linhas exclusivas. Ideal para cozinheiros, restaurantes e amantes da gastronomia.
              </p>
              <ul className="mt-6 space-y-2 text-muted-foreground">
                <li>• Pimentas, ervas, sais especiais e blends</li>
                <li>• Kits de presentes para ocasiões especiais</li>
                <li>• Opções para dietas específicas e gastronomia funcional</li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wide">Endereço</span>
              </div>
              <p className="mt-2 text-foreground">
                Rua Peixoto Gomide 448, São Paulo, SP – 01409-000
              </p>
              <p className="mt-1 text-muted-foreground">
                Atendimento online com entrega local rápida.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default LocalSeoSP;
