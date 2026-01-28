import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Loader2,
  Wand2,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  GripVertical,
  Eye,
  Save,
  X,
  CheckCircle,
  ArrowRight,
  Palette,
  Type,
  Layout,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface UploadedImage {
  id: string;
  url: string;
  file?: File;
  name: string;
  isNew?: boolean;
}

interface GeneratedBanner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  button_text: string;
  link_url: string;
  style: "modern" | "classic" | "minimal" | "bold";
}

const AIBannerCreator = () => {
  const [activeTab, setActiveTab] = useState("upload");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBanners, setGeneratedBanners] = useState<GeneratedBanner[]>([]);
  const [selectedBanners, setSelectedBanners] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Customization options
  const [bannerPrompt, setBannerPrompt] = useState("");
  const [bannerStyle, setBannerStyle] = useState<"modern" | "classic" | "minimal" | "bold">("modern");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith("image/")) {
      return null;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name} é muito grande (máx 10MB)`);
      return null;
    }

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `banner-ai-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading:", error);
      return null;
    }
  };

  const handleFilesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const newImages: UploadedImage[] = [];
    let completed = 0;

    for (const file of Array.from(files)) {
      const url = await uploadImage(file);
      if (url) {
        newImages.push({
          id: crypto.randomUUID(),
          url,
          file,
          name: file.name,
          isNew: true,
        });
      }
      completed++;
      setUploadProgress(Math.round((completed / files.length) * 100));
    }

    setUploadedImages((prev) => [...prev, ...newImages]);
    setIsUploading(false);
    setUploadProgress(0);

    if (newImages.length > 0) {
      toast.success(`${newImages.length} imagem(ns) enviada(s)!`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const generateBannersWithAI = async () => {
    if (uploadedImages.length === 0) {
      toast.error("Envie pelo menos uma imagem");
      return;
    }

    setIsGenerating(true);
    setGeneratedBanners([]);

    try {
      // Call the AI edge function to analyze images and generate banner suggestions
      const { data, error } = await supabase.functions.invoke("ai-banner-generator", {
        body: {
          images: uploadedImages.map((img) => img.url),
          prompt: bannerPrompt,
          style: bannerStyle,
        },
      });

      if (error) throw error;

      if (data?.banners && Array.isArray(data.banners)) {
        setGeneratedBanners(data.banners);
        setActiveTab("preview");
        toast.success("Banners gerados com sucesso!");
      } else {
        // Fallback: create basic banners from images
        const fallbackBanners: GeneratedBanner[] = uploadedImages.slice(0, 5).map((img, index) => ({
          id: crypto.randomUUID(),
          title: `Promoção Especial ${index + 1}`,
          subtitle: "Confira nossas ofertas",
          image_url: img.url,
          button_text: "Ver Ofertas",
          link_url: "/promocoes",
          style: bannerStyle,
        }));
        setGeneratedBanners(fallbackBanners);
        setActiveTab("preview");
        toast.success("Banners criados! Personalize os textos conforme desejar.");
      }
    } catch (error) {
      console.error("Error generating banners:", error);
      
      // Fallback on error
      const fallbackBanners: GeneratedBanner[] = uploadedImages.slice(0, 5).map((img, index) => ({
        id: crypto.randomUUID(),
        title: `Destaque ${index + 1}`,
        subtitle: bannerPrompt || "Produtos selecionados para você",
        image_url: img.url,
        button_text: "Saiba Mais",
        link_url: "/produtos",
        style: bannerStyle,
      }));
      setGeneratedBanners(fallbackBanners);
      setActiveTab("preview");
      toast.info("Banners criados com suas imagens. Personalize os textos!");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateBannerField = (bannerId: string, field: keyof GeneratedBanner, value: string) => {
    setGeneratedBanners((prev) =>
      prev.map((b) => (b.id === bannerId ? { ...b, [field]: value } : b))
    );
  };

  const toggleBannerSelection = (bannerId: string) => {
    setSelectedBanners((prev) =>
      prev.includes(bannerId)
        ? prev.filter((id) => id !== bannerId)
        : [...prev, bannerId]
    );
  };

  const saveBannersToCarousel = async () => {
    const bannersToSave = generatedBanners.filter((b) =>
      selectedBanners.includes(b.id)
    );

    if (bannersToSave.length === 0) {
      toast.error("Selecione pelo menos um banner");
      return;
    }

    setIsSaving(true);

    try {
      // Get current max sort order
      const { data: existingBanners } = await supabase
        .from("promotional_banners")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1);

      let sortOrder = (existingBanners?.[0]?.sort_order || 0) + 1;

      for (const banner of bannersToSave) {
        const { error } = await supabase.from("promotional_banners").insert({
          title: banner.title,
          subtitle: banner.subtitle,
          image_url: banner.image_url,
          button_text: banner.button_text,
          link_url: banner.link_url,
          sort_order: sortOrder++,
          is_active: true,
        });

        if (error) throw error;
      }

      toast.success(`${bannersToSave.length} banner(s) adicionado(s) ao carrossel!`);
      
      // Reset state
      setUploadedImages([]);
      setGeneratedBanners([]);
      setSelectedBanners([]);
      setBannerPrompt("");
      setActiveTab("upload");
    } catch (error) {
      console.error("Error saving banners:", error);
      toast.error("Erro ao salvar banners");
    } finally {
      setIsSaving(false);
    }
  };

  const getStyleDescription = (style: string) => {
    switch (style) {
      case "modern":
        return "Clean, minimalista com cores vibrantes";
      case "classic":
        return "Elegante e atemporal";
      case "minimal":
        return "Foco total na imagem";
      case "bold":
        return "Cores fortes e impactantes";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" />
            Criar Banners com IA
          </h2>
          <p className="text-muted-foreground">
            Envie fotos e deixe a IA criar banners profissionais para o carrossel
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            1. Enviar Fotos
          </TabsTrigger>
          <TabsTrigger value="configure" className="gap-2" disabled={uploadedImages.length === 0}>
            <Palette className="h-4 w-4" />
            2. Configurar
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2" disabled={generatedBanners.length === 0}>
            <Eye className="h-4 w-4" />
            3. Editar & Publicar
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Envie suas imagens</CardTitle>
              <CardDescription>
                Envie quantas fotos quiser. A IA analisará e criará banners profissionais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Area */}
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">Clique para enviar imagens</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ou arraste e solte aqui • JPG, PNG, WebP • Sem limite de quantidade
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFilesUpload}
                />
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Enviando imagens... {uploadProgress}%</p>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Uploaded Images Grid */}
              {uploadedImages.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {uploadedImages.length} imagem(ns) enviada(s)
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadedImages([])}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Limpar tudo
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                    {uploadedImages.map((image) => (
                      <div
                        key={image.id}
                        className="relative group aspect-square rounded-lg overflow-hidden border"
                      >
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8"
                            onClick={() => removeImage(image.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setActiveTab("configure")}>
                      Continuar
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configure Tab */}
        <TabsContent value="configure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configurar estilo dos banners</CardTitle>
              <CardDescription>
                Personalize como a IA deve criar seus banners
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Style Selection */}
              <div className="space-y-3">
                <Label>Estilo do Banner</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(["modern", "classic", "minimal", "bold"] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => setBannerStyle(style)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        bannerStyle === style
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "hover:border-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Layout className="h-4 w-4" />
                        <span className="font-medium capitalize">{style}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getStyleDescription(style)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt */}
              <div className="space-y-2">
                <Label htmlFor="prompt" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Descrição / Contexto (opcional)
                </Label>
                <Textarea
                  id="prompt"
                  value={bannerPrompt}
                  onChange={(e) => setBannerPrompt(e.target.value)}
                  placeholder="Ex: Promoção de verão com 30% off em temperos, Lançamento de novos produtos gourmet, Campanha de Natal..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Descreva o tema ou promoção para textos mais relevantes
                </p>
              </div>

              {/* Preview of selected images */}
              <div className="space-y-2">
                <Label>Imagens selecionadas ({uploadedImages.length})</Label>
                <div className="flex gap-2 flex-wrap">
                  {uploadedImages.slice(0, 8).map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt=""
                      className="w-16 h-16 object-cover rounded border"
                    />
                  ))}
                  {uploadedImages.length > 8 && (
                    <div className="w-16 h-16 rounded border bg-muted flex items-center justify-center text-muted-foreground text-sm">
                      +{uploadedImages.length - 8}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setActiveTab("upload")}>
                  Voltar
                </Button>
                <Button onClick={generateBannersWithAI} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando banners...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Gerar Banners com IA
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview & Edit Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Editar e publicar banners</CardTitle>
              <CardDescription>
                Selecione os banners que deseja adicionar ao carrossel principal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {generatedBanners.map((banner, index) => (
                    <div
                      key={banner.id}
                      className={`border rounded-lg overflow-hidden transition-all ${
                        selectedBanners.includes(banner.id)
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                    >
                      {/* Banner Preview */}
                      <div className="relative aspect-[3/1] bg-muted">
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent">
                          <div className="absolute bottom-4 left-4 text-white max-w-md">
                            <h3 className="text-2xl font-bold">{banner.title}</h3>
                            <p className="text-white/80">{banner.subtitle}</p>
                            {banner.button_text && (
                              <span className="inline-block mt-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium">
                                {banner.button_text}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Selection checkbox */}
                        <button
                          onClick={() => toggleBannerSelection(banner.id)}
                          className={`absolute top-4 right-4 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedBanners.includes(banner.id)
                              ? "bg-primary border-primary text-primary-foreground"
                              : "bg-white/80 border-white"
                          }`}
                        >
                          {selectedBanners.includes(banner.id) && (
                            <CheckCircle className="h-5 w-5" />
                          )}
                        </button>
                      </div>

                      {/* Edit Fields */}
                      <div className="p-4 bg-card space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <GripVertical className="h-4 w-4" />
                          Banner {index + 1}
                          <Badge variant="outline" className="ml-auto">
                            {banner.style}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Título</Label>
                            <Input
                              value={banner.title}
                              onChange={(e) =>
                                updateBannerField(banner.id, "title", e.target.value)
                              }
                              placeholder="Título do banner"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Subtítulo</Label>
                            <Input
                              value={banner.subtitle}
                              onChange={(e) =>
                                updateBannerField(banner.id, "subtitle", e.target.value)
                              }
                              placeholder="Subtítulo"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Texto do Botão</Label>
                            <Input
                              value={banner.button_text}
                              onChange={(e) =>
                                updateBannerField(banner.id, "button_text", e.target.value)
                              }
                              placeholder="Saiba Mais"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Link</Label>
                            <Input
                              value={banner.link_url}
                              onChange={(e) =>
                                updateBannerField(banner.id, "link_url", e.target.value)
                              }
                              placeholder="/promocoes"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {selectedBanners.length} banner(s) selecionado(s)
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setActiveTab("configure")}>
                    Voltar
                  </Button>
                  <Button
                    onClick={saveBannersToCarousel}
                    disabled={selectedBanners.length === 0 || isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Adicionar ao Carrossel
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIBannerCreator;
