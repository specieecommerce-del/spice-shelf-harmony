import { useState, useEffect } from "react";
import { Loader2, Mail, Phone, MapPin, Heart, Leaf, Users, Star, Target, Eye } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface AboutUsData {
  title: string;
  subtitle: string;
  story: string;
  mission: string;
  vision: string;
  values: string[];
  team_title: string;
  team_description: string;
  hero_image_url: string;
  store_image_url: string;
  founder_name: string;
  founder_role: string;
  founder_image_url: string;
  founder_bio: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
}

const defaultAboutUs: AboutUsData = {
  title: "No que a Species acredita?",
  subtitle: "Alimentação nutritiva, prazerosa e prática",
  story: "A Species acredita que uma alimentação nutritiva pode também ser prazerosa e prática.\n\nO preparo dos pratos precisa ser fácil, mas não podemos abrir mão da qualidade e da origem dos temperos: os ingredientes que trazem harmonia para tudo.",
  mission: "Colocar nas mãos e bocas das pessoas os melhores temperos e condimentos.",
  vision: "Oferecer cada vez mais e melhores opções de sabores que tragam harmonia para a alimentação de todos.",
  values: [
    "Alimentação sustentável",
    "Alimentação prazerosa",
    "Alimentação inteligente",
  ],
  team_title: "Nossa Equipe",
  team_description: "Uma equipe apaixonada por gastronomia e sabores autênticos, trabalhando todos os dias para trazer o melhor até você.",
  hero_image_url: "",
  store_image_url: "",
  founder_name: "",
  founder_role: "Fundador(a)",
  founder_image_url: "",
  founder_bio: "",
  contact_email: "specieecommerce@gmail.com",
  contact_phone: "(11) 91977-8073",
  contact_address: "Rua Peixoto Gomide 448\nSão Paulo, SP - 01409-000",
};

const AboutUs = () => {
  const [aboutUs, setAboutUs] = useState<AboutUsData>(defaultAboutUs);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAboutUs = async () => {
      try {
        const { data, error } = await supabase
          .from("store_settings")
          .select("value")
          .eq("key", "about_us")
          .maybeSingle();

        if (error && error.code !== "PGRST116") throw error;
        
        if (data?.value) {
          setAboutUs({ ...defaultAboutUs, ...(data.value as unknown as AboutUsData) });
        }
      } catch (err) {
        console.error("Error loading about us:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAboutUs();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-32 pb-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24">
        {/* Hero Section */}
        <section 
          className="relative bg-gradient-to-br from-spice-forest/90 to-spice-forest py-20 md:py-32"
          style={aboutUs.hero_image_url ? {
            backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${aboutUs.hero_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined}
        >
          <div className="container-species text-center text-white">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              {aboutUs.title}
            </h1>
            <p className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto">
              {aboutUs.subtitle}
            </p>
          </div>
        </section>

        {/* Nossa História */}
        <section className="py-16 md:py-24 bg-spice-warm-white">
          <div className="container-species">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-2 text-primary mb-4">
                  <Heart className="h-5 w-5" />
                  <span className="text-sm font-medium uppercase tracking-wide">Nossa História</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                  De uma paixão familiar nasceu a Species
                </h2>
                <div className="prose prose-lg text-muted-foreground">
                  {aboutUs.story.split('\n').map((paragraph, idx) => (
                    <p key={idx} className="mb-4">{paragraph}</p>
                  ))}
                </div>
              </div>
              <div className="relative">
                {aboutUs.store_image_url ? (
                  <img 
                    src={aboutUs.store_image_url} 
                    alt="Nossa loja" 
                    className="rounded-2xl shadow-xl w-full aspect-[4/3] object-cover"
                  />
                ) : (
                  <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 w-full aspect-[4/3] flex items-center justify-center">
                    <Leaf className="h-24 w-24 text-primary/30" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Missão, Visão e Valores */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container-species">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Nossos Pilares
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {/* Missão */}
              <Card className="border-2 border-spice-forest/20 bg-spice-forest/5">
                <CardContent className="pt-8 pb-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-spice-forest/10 flex items-center justify-center mx-auto mb-4">
                    <Target className="h-8 w-8 text-spice-forest" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Missão</h3>
                  <p className="text-muted-foreground">{aboutUs.mission}</p>
                </CardContent>
              </Card>

              {/* Visão */}
              <Card className="border-2 border-accent/40 bg-accent/5">
                <CardContent className="pt-8 pb-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                    <Eye className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Visão</h3>
                  <p className="text-muted-foreground">{aboutUs.vision}</p>
                </CardContent>
              </Card>

              {/* Valores */}
              <Card className="border-2 border-spice-gold/40 bg-spice-gold/5">
                <CardContent className="pt-8 pb-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-spice-gold/20 flex items-center justify-center mx-auto mb-4">
                    <Star className="h-8 w-8 text-spice-gold" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Valores</h3>
                  <ul className="text-muted-foreground space-y-1">
                    {aboutUs.values.map((value, idx) => (
                      <li key={idx} className="flex items-center justify-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-spice-gold" />
                        {value}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Fundador */}
        {aboutUs.founder_name && (
          <section className="py-16 md:py-24 bg-spice-warm-white">
            <div className="container-species">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <div className="flex items-center justify-center gap-2 text-primary mb-4">
                    <Users className="h-5 w-5" />
                    <span className="text-sm font-medium uppercase tracking-wide">Quem está por trás</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                    Conheça nosso(a) fundador(a)
                  </h2>
                </div>

                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="grid md:grid-cols-3">
                      <div className="md:col-span-1 bg-gradient-to-br from-spice-forest to-spice-forest/80 p-8 flex flex-col items-center justify-center text-center text-white">
                        {aboutUs.founder_image_url ? (
                          <img 
                            src={aboutUs.founder_image_url} 
                            alt={aboutUs.founder_name}
                            className="h-32 w-32 rounded-full object-cover border-4 border-white/20 mb-4"
                          />
                        ) : (
                          <div className="h-32 w-32 rounded-full bg-white/10 flex items-center justify-center mb-4">
                            <Users className="h-16 w-16 text-white/50" />
                          </div>
                        )}
                        <h3 className="text-xl font-bold">{aboutUs.founder_name}</h3>
                        <p className="text-white/80">{aboutUs.founder_role}</p>
                      </div>
                      <div className="md:col-span-2 p-8">
                        <p className="text-muted-foreground text-lg leading-relaxed">
                          {aboutUs.founder_bio || "Apaixonado(a) por gastronomia e temperos naturais, dedicou sua vida a trazer os melhores sabores para as mesas brasileiras."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}

        {/* Contato */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container-species">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
                Entre em Contato
              </h2>
              
              <div className="grid sm:grid-cols-3 gap-6">
                {aboutUs.contact_email && (
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6 text-center">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <p className="font-medium text-foreground">E-mail</p>
                      <a 
                        href={`mailto:${aboutUs.contact_email}`}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {aboutUs.contact_email}
                      </a>
                    </CardContent>
                  </Card>
                )}

                {aboutUs.contact_phone && (
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6 text-center">
                      <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3">
                        <Phone className="h-5 w-5 text-accent" />
                      </div>
                      <p className="font-medium text-foreground">Telefone</p>
                      <a 
                        href={`tel:${aboutUs.contact_phone.replace(/\D/g, '')}`}
                        className="text-sm text-muted-foreground hover:text-accent transition-colors"
                      >
                        {aboutUs.contact_phone}
                      </a>
                    </CardContent>
                  </Card>
                )}

                {aboutUs.contact_address && (
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6 text-center">
                      <div className="h-12 w-12 rounded-full bg-spice-gold/20 flex items-center justify-center mx-auto mb-3">
                        <MapPin className="h-5 w-5 text-spice-gold" />
                      </div>
                      <p className="font-medium text-foreground">Endereço</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {aboutUs.contact_address}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutUs;
