import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, Globe, Type, Image, Palette, Upload, Link, Trash2, RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SiteContent {
  header: {
    logo_url: string;
    promo_bar_text: string;
    promo_bar_enabled: boolean;
  };
  hero: {
    title: string;
    subtitle: string;
    description: string;
    cta_text: string;
    cta_link: string;
    secondary_cta_text: string;
    secondary_cta_link: string;
    background_image: string;
    background_position_x: number;
    background_position_y: number;
    background_scale: number;
    badge_text: string;
    badge_enabled: boolean;
    trust_badge_1_icon: string;
    trust_badge_1_text: string;
    trust_badge_2_icon: string;
    trust_badge_2_text: string;
    trust_badge_3_icon: string;
    trust_badge_3_text: string;
    show_trust_badges: boolean;
    overlay_opacity: number;
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
    title: "Receitas incríveis",
    subtitle: "começam aqui",
    description: "Descubra nossa seleção de temperos, ervas e especiarias artesanais que transformam qualquer prato em uma experiência gastronômica única.",
    cta_text: "Compre Agora",
    cta_link: "/produtos",
    secondary_cta_text: "Ver Receitas",
    secondary_cta_link: "/receitas",
    background_image: "",
    background_position_x: 50,
    background_position_y: 50,
    background_scale: 100,
    badge_text: "✨ Temperos Premium & Artesanais",
    badge_enabled: true,
    trust_badge_1_icon: "🚚",
    trust_badge_1_text: "Frete Grátis +R$150",
    trust_badge_2_icon: "🔒",
    trust_badge_2_text: "Pagamento Seguro",
    trust_badge_3_icon: "⭐",
    trust_badge_3_text: "+5000 Clientes Felizes",
    show_trust_badges: true,
    overlay_opacity: 60,
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
  const [isUploading, setIsUploading] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<Record<string, "file" | "url">>({});
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    section: "header" | "hero",
    field: "logo_url" | "background_image"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${section}-${field}-${Date.now()}.${fileExt}`;
      const filePath = `site-content/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      if (section === "header") {
        updateSection("header", field as keyof SiteContent["header"], urlData.publicUrl);
      } else {
        updateSection("hero", field as keyof SiteContent["hero"], urlData.publicUrl);
      }
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setIsUploading(false);
    }
  };

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

  const resetSection = async (section: keyof SiteContent) => {
    setContent((prev) => ({
      ...prev,
      [section]: defaultContent[section],
    }));
    toast.success("Seção resetada. Clique em Salvar para confirmar.");
  };

  const clearSection = (section: keyof SiteContent) => {
    const emptySection = Object.keys(content[section]).reduce((acc, key) => {
      const value = (content[section] as any)[key];
      if (typeof value === "string") {
        acc[key] = "";
      } else if (typeof value === "boolean") {
        acc[key] = false;
      } else if (Array.isArray(value)) {
        acc[key] = [];
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    setContent((prev) => ({
      ...prev,
      [section]: emptySection,
    }));
    toast.success("Seção limpa. Clique em Salvar para confirmar.");
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

  const getInputMode = (key: string) => imageInputMode[key] || "file";
  const setInputMode = (key: string, mode: "file" | "url") => {
    setImageInputMode((prev) => ({ ...prev, [key]: mode }));
  };

  const renderImageInput = (
    section: "header" | "hero",
    field: "logo_url" | "background_image",
    label: string,
    inputRef: React.RefObject<HTMLInputElement>,
    currentValue: string
  ) => {
    const key = `${section}-${field}`;
    const mode = getInputMode(key);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{label}</Label>
          <div className="flex gap-1">
            <Button
              type="button"
              variant={mode === "file" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode(key, "file")}
            >
              <Upload className="h-3 w-3 mr-1" />
              Arquivo
            </Button>
            <Button
              type="button"
              variant={mode === "url" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode(key, "url")}
            >
              <Link className="h-3 w-3 mr-1" />
              URL
            </Button>
          </div>
        </div>

        {mode === "file" ? (
          <div className="space-y-2">
            <Input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, section, field)}
              disabled={isUploading}
            />
            {isUploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </div>
            )}
          </div>
        ) : (
          <Input
            value={currentValue}
            onChange={(e) => {
              if (section === "header") {
                updateSection("header", field as keyof SiteContent["header"], e.target.value);
              } else {
                updateSection("hero", field as keyof SiteContent["hero"], e.target.value);
              }
            }}
            placeholder="https://..."
          />
        )}

        {currentValue && (
          <div className="flex items-center gap-2">
            <img
              src={currentValue}
              alt="Preview"
              className="h-16 w-auto rounded border object-cover"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (section === "header") {
                  updateSection("header", field as keyof SiteContent["header"], "");
                } else {
                  updateSection("hero", field as keyof SiteContent["hero"], "");
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderSectionActions = (section: keyof SiteContent) => (
    <div className="flex gap-2 flex-wrap">
      <Button onClick={() => saveSection(section)} disabled={isSaving}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Salvar
      </Button>
      <Button variant="outline" onClick={() => resetSection(section)}>
        <RotateCcw className="h-4 w-4 mr-2" />
        Restaurar Padrão
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Tudo
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar seção?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai remover todo o conteúdo desta seção. Você precisará salvar para confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => clearSection(section)}>
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

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
        <p className="text-muted-foreground">Edite textos, imagens e configurações do site. Controle total sobre todo o conteúdo.</p>
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
              {renderImageInput("header", "logo_url", "Logo", logoInputRef, content.header.logo_url)}
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
              {renderSectionActions("header")}
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
              <CardDescription>Configure todos os elementos do banner hero da página inicial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Badge/Tag */}
              <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
                <h4 className="font-medium">Tag/Badge</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Texto do Badge</Label>
                    <Input
                      value={content.hero.badge_text}
                      onChange={(e) => updateSection("hero", "badge_text", e.target.value)}
                      placeholder="✨ Temperos Premium & Artesanais"
                    />
                  </div>
                  <div className="flex items-end gap-2 pb-2">
                    <input
                      type="checkbox"
                      checked={content.hero.badge_enabled}
                      onChange={(e) => updateSection("hero", "badge_enabled", e.target.checked)}
                      className="rounded"
                    />
                    <Label>Exibir badge</Label>
                  </div>
                </div>
              </div>

              {/* Títulos */}
              <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
                <h4 className="font-medium">Títulos</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Título Principal (1ª linha)</Label>
                    <Input
                      value={content.hero.title}
                      onChange={(e) => updateSection("hero", "title", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Subtítulo (2ª linha - em destaque)</Label>
                    <Input
                      value={content.hero.subtitle}
                      onChange={(e) => updateSection("hero", "subtitle", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={content.hero.description}
                    onChange={(e) => updateSection("hero", "description", e.target.value)}
                    rows={3}
                    placeholder="Texto descritivo abaixo do título..."
                  />
                </div>
              </div>

              {/* Botões CTA */}
              <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
                <h4 className="font-medium">Botões de Ação (CTA)</h4>
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
              </div>

              {/* Trust Badges */}
              <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Selos de Confiança</h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={content.hero.show_trust_badges}
                      onChange={(e) => updateSection("hero", "show_trust_badges", e.target.checked)}
                      className="rounded"
                    />
                    <Label className="text-sm">Exibir selos</Label>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Selo 1 - Ícone (emoji)</Label>
                    <Input
                      value={content.hero.trust_badge_1_icon}
                      onChange={(e) => updateSection("hero", "trust_badge_1_icon", e.target.value)}
                      placeholder="🚚"
                    />
                    <Label>Selo 1 - Texto</Label>
                    <Input
                      value={content.hero.trust_badge_1_text}
                      onChange={(e) => updateSection("hero", "trust_badge_1_text", e.target.value)}
                      placeholder="Frete Grátis +R$150"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Selo 2 - Ícone (emoji)</Label>
                    <Input
                      value={content.hero.trust_badge_2_icon}
                      onChange={(e) => updateSection("hero", "trust_badge_2_icon", e.target.value)}
                      placeholder="🔒"
                    />
                    <Label>Selo 2 - Texto</Label>
                    <Input
                      value={content.hero.trust_badge_2_text}
                      onChange={(e) => updateSection("hero", "trust_badge_2_text", e.target.value)}
                      placeholder="Pagamento Seguro"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Selo 3 - Ícone (emoji)</Label>
                    <Input
                      value={content.hero.trust_badge_3_icon}
                      onChange={(e) => updateSection("hero", "trust_badge_3_icon", e.target.value)}
                      placeholder="⭐"
                    />
                    <Label>Selo 3 - Texto</Label>
                    <Input
                      value={content.hero.trust_badge_3_text}
                      onChange={(e) => updateSection("hero", "trust_badge_3_text", e.target.value)}
                      placeholder="+5000 Clientes Felizes"
                    />
                  </div>
                </div>
              </div>

              {/* Imagem e Overlay */}
              <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                <h4 className="font-medium">Imagem de Fundo</h4>
                {renderImageInput("hero", "background_image", "Imagem de Fundo", heroInputRef, content.hero.background_image)}
                
                {/* Posição da Imagem */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Posição Horizontal ({content.hero.background_position_x}%)</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={content.hero.background_position_x}
                      onChange={(e) => updateSection("hero", "background_position_x", parseInt(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">0% = esquerda, 50% = centro, 100% = direita</p>
                  </div>
                  <div>
                    <Label>Posição Vertical ({content.hero.background_position_y}%)</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={content.hero.background_position_y}
                      onChange={(e) => updateSection("hero", "background_position_y", parseInt(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">0% = topo, 50% = centro, 100% = base</p>
                  </div>
                </div>

                {/* Escala da Imagem */}
                <div>
                  <Label>Escala/Zoom da Imagem ({content.hero.background_scale}%)</Label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={content.hero.background_scale}
                    onChange={(e) => updateSection("hero", "background_scale", parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">100% = tamanho original, valores maiores = zoom in</p>
                </div>

                {/* Opacidade do Overlay */}
                <div>
                  <Label>Opacidade do Overlay ({content.hero.overlay_opacity}%)</Label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={content.hero.overlay_opacity}
                    onChange={(e) => updateSection("hero", "overlay_opacity", parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">Controla a transparência da camada sobre a imagem de fundo</p>
                </div>
              </div>

              {renderSectionActions("hero")}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      const newItems = content.benefits_bar.items.filter((_, i) => i !== index);
                      setContent(prev => ({
                        ...prev,
                        benefits_bar: { items: newItems }
                      }));
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remover
                  </Button>
                </Card>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  const newItems = [...content.benefits_bar.items, { icon: "", title: "", description: "" }];
                  setContent(prev => ({
                    ...prev,
                    benefits_bar: { items: newItems }
                  }));
                }}
              >
                Adicionar Item
              </Button>
              {renderSectionActions("benefits_bar")}
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
              {renderSectionActions("footer")}
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
              {renderSectionActions("colors")}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SiteContentManager;
