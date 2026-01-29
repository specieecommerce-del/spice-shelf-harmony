import { useState, useEffect, useRef } from "react";
import { Users, Loader2, Save, Image as ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
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
  logo_url: string;
  founder_name: string;
  founder_role: string;
  founder_image_url: string;
  founder_bio: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
}

const defaultAboutUs: AboutUsData = {
  title: "Nossa História",
  subtitle: "Temperos naturais com amor e tradição",
  story: "A Species nasceu do amor por temperos naturais e da vontade de trazer sabores autênticos para sua cozinha. Nossa jornada começou em uma pequena cozinha, com receitas de família passadas de geração em geração.",
  mission: "Oferecer temperos naturais de alta qualidade, valorizando a agricultura familiar e práticas sustentáveis.",
  vision: "Ser referência nacional em temperos naturais, conectando produtores locais a consumidores conscientes.",
  values: [
    "Qualidade sem compromisso",
    "Sustentabilidade em cada etapa",
    "Valorização dos produtores locais",
    "Transparência e honestidade",
  ],
  team_title: "Nossa Equipe",
  team_description: "Uma equipe apaixonada por gastronomia e sabores autênticos.",
  hero_image_url: "",
  store_image_url: "",
  logo_url: "",
  founder_name: "",
  founder_role: "Fundador(a)",
  founder_image_url: "",
  founder_bio: "",
  contact_email: "",
  contact_phone: "",
  contact_address: "",
};

const AboutUsManager = () => {
  const { toast } = useToast();
  const [aboutUs, setAboutUs] = useState<AboutUsData>(defaultAboutUs);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [valuesText, setValuesText] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAboutUs();
  }, []);

  const loadAboutUs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "about_us")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data?.value) {
        const loadedData = { ...defaultAboutUs, ...(data.value as unknown as AboutUsData) };
        setAboutUs(loadedData);
        setValuesText(loadedData.values.join("\n"));
      } else {
        setValuesText(defaultAboutUs.values.join("\n"));
      }
      setHasChanges(false);
    } catch (err) {
      console.error("Error loading about us:", err);
      toast({
        title: "Erro ao carregar dados",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dataToSave: AboutUsData = {
        ...aboutUs,
        values: valuesText.split("\n").filter(v => v.trim()),
      };

      // Check if record exists
      const { data: existing } = await supabase
        .from("store_settings")
        .select("id")
        .eq("key", "about_us")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("store_settings")
          .update({
            value: JSON.parse(JSON.stringify(dataToSave)),
            updated_at: new Date().toISOString(),
          })
          .eq("key", "about_us");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("store_settings")
          .insert({
            key: "about_us",
            value: JSON.parse(JSON.stringify(dataToSave)),
          });
        if (error) throw error;
      }

      setAboutUs(dataToSave);
      setHasChanges(false);
      toast({
        title: "Dados salvos!",
        description: "As informações 'Quem Somos' foram atualizadas.",
      });
    } catch (err) {
      console.error("Error saving about us:", err);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as informações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof AboutUsData, value: string) => {
    setAboutUs(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Apenas imagens são permitidas", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "A imagem deve ter no máximo 5MB", variant: "destructive" });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      updateField("logo_url", urlData.publicUrl);
      toast({ title: "Logo enviado com sucesso!" });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({ title: "Erro ao enviar logo", variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const removeLogo = () => {
    updateField("logo_url", "");
    toast({ title: "Logo removido" });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200 flex items-center justify-between">
          <span>⚠️ Você tem alterações não salvas</span>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Agora
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Quem Somos
          </CardTitle>
          <CardDescription>
            Configure as informações da página "Quem Somos" da sua loja.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo da Empresa */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Logo da Empresa
              </CardTitle>
              <CardDescription>
                Este logo aparecerá no cabeçalho onde está escrito "Species"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {aboutUs.logo_url ? (
                  <div className="relative">
                    <img 
                      src={aboutUs.logo_url} 
                      alt="Logo da empresa" 
                      className="h-20 w-auto max-w-[200px] object-contain rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={removeLogo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="h-20 w-40 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed">
                    <span className="text-muted-foreground text-sm">Sem logo</span>
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {aboutUs.logo_url ? "Alterar Logo" : "Enviar Logo"}
                  </Button>
                  <p className="text-xs text-muted-foreground">PNG, JPG ou SVG. Máximo 5MB.</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Ou cole a URL do logo</Label>
                <Input
                  value={aboutUs.logo_url}
                  onChange={(e) => updateField("logo_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Hero Section */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cabeçalho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Título Principal</Label>
                  <Input
                    value={aboutUs.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="Nossa História"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo</Label>
                  <Input
                    value={aboutUs.subtitle}
                    onChange={(e) => updateField("subtitle", e.target.value)}
                    placeholder="Temperos naturais com amor"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>URL da Imagem do Banner</Label>
                <Input
                  value={aboutUs.hero_image_url}
                  onChange={(e) => updateField("hero_image_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Nossa História */}
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Nossa História</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Conte a história da sua empresa</Label>
                <Textarea
                  value={aboutUs.story}
                  onChange={(e) => updateField("story", e.target.value)}
                  placeholder="A Species nasceu do amor por temperos..."
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label>URL da Imagem da Loja/Empresa</Label>
                <Input
                  value={aboutUs.store_image_url}
                  onChange={(e) => updateField("store_image_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Missão, Visão e Valores */}
          <Card className="border-purple-200 bg-purple-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Missão, Visão e Valores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Missão</Label>
                <Textarea
                  value={aboutUs.mission}
                  onChange={(e) => updateField("mission", e.target.value)}
                  placeholder="Oferecer temperos naturais de alta qualidade..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Visão</Label>
                <Textarea
                  value={aboutUs.vision}
                  onChange={(e) => updateField("vision", e.target.value)}
                  placeholder="Ser referência nacional em temperos naturais..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Valores (um por linha)</Label>
                <Textarea
                  value={valuesText}
                  onChange={(e) => { setValuesText(e.target.value); setHasChanges(true); }}
                  placeholder="Qualidade&#10;Sustentabilidade&#10;Transparência"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Fundador */}
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Fundador(a)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={aboutUs.founder_name}
                    onChange={(e) => updateField("founder_name", e.target.value)}
                    placeholder="Maria Silva"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input
                    value={aboutUs.founder_role}
                    onChange={(e) => updateField("founder_role", e.target.value)}
                    placeholder="Fundador(a) e CEO"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Biografia</Label>
                <Textarea
                  value={aboutUs.founder_bio}
                  onChange={(e) => updateField("founder_bio", e.target.value)}
                  placeholder="Apaixonado(a) por gastronomia..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>URL da Foto</Label>
                <Input
                  value={aboutUs.founder_image_url}
                  onChange={(e) => updateField("founder_image_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card className="border-rose-200 bg-rose-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    value={aboutUs.contact_email}
                    onChange={(e) => updateField("contact_email", e.target.value)}
                    placeholder="contato@species.com.br"
                    type="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone/WhatsApp</Label>
                  <Input
                    value={aboutUs.contact_phone}
                    onChange={(e) => updateField("contact_phone", e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Textarea
                  value={aboutUs.contact_address}
                  onChange={(e) => updateField("contact_address", e.target.value)}
                  placeholder="Rua das Especiarias, 123&#10;São Paulo - SP"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Salvar */}
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Todas as Alterações
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AboutUsManager;
