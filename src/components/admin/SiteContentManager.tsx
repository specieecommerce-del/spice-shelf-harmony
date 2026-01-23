import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, Globe, Type, Image, Palette } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface SiteContent {
  header: {
    logo_url: string;
    promo_bar_text: string;
    promo_bar_enabled: boolean;
  };
  hero: {
    title: string;
    subtitle: string;
    cta_text: string;
    cta_link: string;
    secondary_cta_text: string;
    secondary_cta_link: string;
    background_image: string;
  };
  benefits_bar: {
    items: { icon: string; title: string; description: string }[];
  };
  footer: {
    tagline: string;
    address: string;
    phone: string;
    email: string;
    instagram: string;
    facebook: string;
    youtube: string;
  };
  colors: {
    primary: string;
    accent: string;
  };
}

const defaultContent: SiteContent = {
  header: {
    logo_url: "",
    promo_bar_text: "Frete Grátis para compras acima de R$ 150",
    promo_bar_enabled: true,
  },
  hero: {
    title: "Temperos que Transformam suas Receitas",
    subtitle: "Descubra a arte de cozinhar com especiarias selecionadas que elevam o sabor de cada prato.",
    cta_text: "Compre Agora",
    cta_link: "/produtos",
    secondary_cta_text: "Ver Receitas",
    secondary_cta_link: "/receitas",
    background_image: "",
  },
  benefits_bar: {
    items: [
      { icon: "Truck", title: "Frete Grátis", description: "Acima de R$ 150" },
      { icon: "Shield", title: "100% Seguro", description: "Pagamento protegido" },
      { icon: "RotateCcw", title: "Troca Fácil", description: "Em até 7 dias" },
    ],
  },
  footer: {
    tagline: "Especiarias premium para transformar suas receitas em experiências inesquecíveis.",
    address: "Rua das Especiarias, 123 - São Paulo, SP",
    phone: "(11) 99999-9999",
    email: "contato@species.com.br",
    instagram: "https://instagram.com/species",
    facebook: "https://facebook.com/species",
    youtube: "https://youtube.com/species",
  },
  colors: {
    primary: "142 71% 29%",
    accent: "43 74% 49%",
  },
};

const SiteContentManager = () => {
  const [content, setContent] = useState<SiteContent>(defaultContent);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadContent = async () => {
    const { data, error } = await supabase
      .from("site_content")
      .select("section, content")
      .in("section", ["header", "hero", "benefits_bar", "footer", "colors"]);

    if (error) {
      console.error("Error loading content:", error);
      setIsLoading(false);
      return;
    }

    const loadedContent = { ...defaultContent };
    data?.forEach((item) => {
      if (item.section in loadedContent && typeof item.content === 'object' && item.content !== null) {
        (loadedContent as any)[item.section] = { 
          ...(defaultContent as any)[item.section], 
          ...(item.content as Record<string, unknown>)
        };
      }
    });

    setContent(loadedContent);
    setIsLoading(false);
  };

  useEffect(() => {
    loadContent();
  }, []);

  const saveSection = async (section: keyof SiteContent) => {
    setIsSaving(true);

    const { error } = await supabase
      .from("site_content")
      .upsert(
        { section, content: content[section] },
        { onConflict: "section" }
      );

    if (error) {
      toast.error("Erro ao salvar");
      setIsSaving(false);
      return;
    }

    toast.success("Salvo com sucesso!");
    setIsSaving(false);
  };

  const updateSection = <T extends keyof SiteContent>(
    section: T,
    field: keyof SiteContent[T],
    value: any
  ) => {
    setContent((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Conteúdo do Site</h2>
        <p className="text-muted-foreground">Edite textos, imagens e configurações do site</p>
      </div>

      <Tabs defaultValue="header" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="header">Cabeçalho</TabsTrigger>
          <TabsTrigger value="hero">Banner Principal</TabsTrigger>
          <TabsTrigger value="benefits">Barra de Benefícios</TabsTrigger>
          <TabsTrigger value="footer">Rodapé</TabsTrigger>
          <TabsTrigger value="colors">Cores</TabsTrigger>
        </TabsList>

        <TabsContent value="header">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Cabeçalho
              </CardTitle>
              <CardDescription>Configure o cabeçalho e barra promocional</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>URL do Logo</Label>
                <Input
                  value={content.header.logo_url}
                  onChange={(e) => updateSection("header", "logo_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Texto da Barra Promocional</Label>
                <Input
                  value={content.header.promo_bar_text}
                  onChange={(e) => updateSection("header", "promo_bar_text", e.target.value)}
                  placeholder="Frete Grátis para compras acima de R$ 150"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={content.header.promo_bar_enabled}
                  onChange={(e) => updateSection("header", "promo_bar_enabled", e.target.checked)}
                  className="rounded"
                />
                <Label>Exibir barra promocional</Label>
              </div>
              <Button onClick={() => saveSection("header")} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Cabeçalho
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Banner Principal
              </CardTitle>
              <CardDescription>Configure o banner hero da página inicial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título Principal</Label>
                <Input
                  value={content.hero.title}
                  onChange={(e) => updateSection("hero", "title", e.target.value)}
                />
              </div>
              <div>
                <Label>Subtítulo</Label>
                <Textarea
                  value={content.hero.subtitle}
                  onChange={(e) => updateSection("hero", "subtitle", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Texto do Botão Principal</Label>
                  <Input
                    value={content.hero.cta_text}
                    onChange={(e) => updateSection("hero", "cta_text", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Link do Botão Principal</Label>
                  <Input
                    value={content.hero.cta_link}
                    onChange={(e) => updateSection("hero", "cta_link", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Texto do Botão Secundário</Label>
                  <Input
                    value={content.hero.secondary_cta_text}
                    onChange={(e) => updateSection("hero", "secondary_cta_text", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Link do Botão Secundário</Label>
                  <Input
                    value={content.hero.secondary_cta_link}
                    onChange={(e) => updateSection("hero", "secondary_cta_link", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>URL da Imagem de Fundo</Label>
                <Input
                  value={content.hero.background_image}
                  onChange={(e) => updateSection("hero", "background_image", e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <Button onClick={() => saveSection("hero")} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Banner
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benefits">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Barra de Benefícios
              </CardTitle>
              <CardDescription>Configure os itens da barra de benefícios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.benefits_bar.items.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Ícone (Lucide)</Label>
                      <Input
                        value={item.icon}
                        onChange={(e) => {
                          const newItems = [...content.benefits_bar.items];
                          newItems[index] = { ...newItems[index], icon: e.target.value };
                          setContent(prev => ({
                            ...prev,
                            benefits_bar: { items: newItems }
                          }));
                        }}
                        placeholder="Truck, Shield, etc."
                      />
                    </div>
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={item.title}
                        onChange={(e) => {
                          const newItems = [...content.benefits_bar.items];
                          newItems[index] = { ...newItems[index], title: e.target.value };
                          setContent(prev => ({
                            ...prev,
                            benefits_bar: { items: newItems }
                          }));
                        }}
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...content.benefits_bar.items];
                          newItems[index] = { ...newItems[index], description: e.target.value };
                          setContent(prev => ({
                            ...prev,
                            benefits_bar: { items: newItems }
                          }));
                        }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
              <Button onClick={() => saveSection("benefits_bar")} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Benefícios
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Rodapé
              </CardTitle>
              <CardDescription>Configure as informações do rodapé</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tagline</Label>
                <Textarea
                  value={content.footer.tagline}
                  onChange={(e) => updateSection("footer", "tagline", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Endereço</Label>
                  <Input
                    value={content.footer.address}
                    onChange={(e) => updateSection("footer", "address", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={content.footer.phone}
                    onChange={(e) => updateSection("footer", "phone", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  value={content.footer.email}
                  onChange={(e) => updateSection("footer", "email", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Instagram</Label>
                  <Input
                    value={content.footer.instagram}
                    onChange={(e) => updateSection("footer", "instagram", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Facebook</Label>
                  <Input
                    value={content.footer.facebook}
                    onChange={(e) => updateSection("footer", "facebook", e.target.value)}
                  />
                </div>
                <div>
                  <Label>YouTube</Label>
                  <Input
                    value={content.footer.youtube}
                    onChange={(e) => updateSection("footer", "youtube", e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={() => saveSection("footer")} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Rodapé
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Cores do Site
              </CardTitle>
              <CardDescription>Configure as cores principais do site (formato HSL)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cor Primária (HSL)</Label>
                  <Input
                    value={content.colors.primary}
                    onChange={(e) => updateSection("colors", "primary", e.target.value)}
                    placeholder="142 71% 29%"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Formato: H S% L%</p>
                </div>
                <div>
                  <Label>Cor de Destaque (HSL)</Label>
                  <Input
                    value={content.colors.accent}
                    onChange={(e) => updateSection("colors", "accent", e.target.value)}
                    placeholder="43 74% 49%"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Formato: H S% L%</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div 
                  className="w-20 h-20 rounded-lg border"
                  style={{ backgroundColor: `hsl(${content.colors.primary})` }}
                />
                <div 
                  className="w-20 h-20 rounded-lg border"
                  style={{ backgroundColor: `hsl(${content.colors.accent})` }}
                />
              </div>
              <Button onClick={() => saveSection("colors")} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Cores
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SiteContentManager;
