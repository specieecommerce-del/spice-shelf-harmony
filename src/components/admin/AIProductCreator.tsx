import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Check, X, Wand2, Image, FileText, Utensils, Upload, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AIProductData {
  name: string;
  description: string;
  long_description: string;
  category: string;
  badges: string[];
  suggested_price: number;
  nutritional_highlights: string[];
  usage_tips: string[];
}

interface NutritionalData {
  calories: number;
  carbohydrates: number;
  proteins: number;
  total_fat: number;
  saturated_fat: number;
  trans_fat: number;
  fiber: number;
  sodium: number;
  portion_size: string;
  disclaimer: string;
}

interface PlatformOutput {
  platform: string;
  platformKey: string;
  dimensions: { width: number; height: number };
  aspectRatio: string;
  recommendations: string[];
}

interface FileAnalysis {
  detected_content?: string;
  dominant_colors?: string[];
  quality_score?: number;
  has_text?: boolean;
  text_content?: string;
  recommendations?: Record<string, string[]>;
}

interface ProcessingStep {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed" | "error";
  message?: string;
}

const AIProductCreator = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [aiData, setAiData] = useState<AIProductData | null>(null);
  const [nutritionalInfo, setNutritionalInfo] = useState<NutritionalData | null>(null);
  const [platformOutputs, setPlatformOutputs] = useState<PlatformOutput[]>([]);
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysis | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    long_description: "",
    category: "",
    badges: "",
    price: "",
    is_active: true,
    stock_quantity: "50",
    low_stock_threshold: "5",
  });

  const updateStep = (stepId: string, status: ProcessingStep["status"], message?: string) => {
    setProcessingSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, message } : step
    ));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Accept images, videos, and PDFs
    const validTypes = ["image/", "video/", "application/pdf"];
    const isValidType = validTypes.some(type => file.type.startsWith(type) || file.type === type);
    
    if (!isValidType) {
      toast.error("Selecione imagens, vídeos ou PDFs");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo deve ter no máximo 20MB");
      return;
    }

    // Initialize processing steps
    setProcessingSteps([
      { id: "upload", label: "Upload do arquivo", status: "pending" },
      { id: "product", label: "Análise do produto", status: "pending" },
      { id: "platforms", label: "Adaptação para plataformas", status: "pending" },
      { id: "nutrition", label: "Informações nutricionais", status: "pending" },
    ]);
    setProcessingProgress(0);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    setIsProcessing(true);
    
    try {
      // Step 1: Upload file
      updateStep("upload", "processing");
      setProcessingProgress(10);
      
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      setUploadedImageUrl(urlData.publicUrl);
      updateStep("upload", "completed", "Arquivo enviado com sucesso");
      setProcessingProgress(25);

      // Convert to base64 for AI processing
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });

      // Run all AI processes in parallel for speed
      updateStep("product", "processing");
      updateStep("platforms", "processing");
      updateStep("nutrition", "processing");

      const [productResult, platformResult, nutritionResult] = await Promise.allSettled([
        // Step 2: Product analysis
        supabase.functions.invoke("ai-product-analyzer", {
          body: { imageBase64: base64 },
        }),
        // Step 3: Platform adaptation analysis
        supabase.functions.invoke("ai-file-processor", {
          body: {
            fileBase64: base64,
            fileType: file.type,
            fileName: file.name,
            targetPlatforms: ["instagram_feed", "instagram_stories", "facebook_ads", "google_ads_display", "marketplace", "whatsapp_status"],
          },
        }),
        // Step 4: Nutrition analysis using auto method (analyzes image directly)
        file.type.startsWith("image/") 
          ? supabase.functions.invoke("ai-nutrition-generator", {
              body: { method: "auto", imageBase64: base64 },
            })
          : Promise.resolve({ data: null, error: null }),
      ]);

      setProcessingProgress(75);

      // Process product analysis result
      if (productResult.status === "fulfilled" && productResult.value.data) {
        const data = productResult.value.data;
        setAiData(data);
        setFormData({
          name: data.name || "",
          description: data.description || "",
          long_description: data.long_description || "",
          category: data.category || "",
          badges: data.badges?.join(", ") || "",
          price: data.suggested_price ? String(data.suggested_price / 100) : "",
          is_active: true,
          stock_quantity: "50",
          low_stock_threshold: "5",
        });
        updateStep("product", "completed", "Produto identificado");
      } else {
        updateStep("product", "error", "Falha na análise do produto");
      }

      // Process platform adaptation result
      if (platformResult.status === "fulfilled" && platformResult.value.data) {
        const data = platformResult.value.data;
        setPlatformOutputs(data.outputs || []);
        setFileAnalysis(data.analysis || null);
        updateStep("platforms", "completed", `${data.outputs?.length || 0} formatos preparados`);
      } else {
        updateStep("platforms", "error", "Falha na adaptação");
      }

      // Process nutrition result
      if (nutritionResult.status === "fulfilled" && nutritionResult.value.data?.data) {
        const nutritionData = nutritionResult.value.data.data;
        setNutritionalInfo({
          calories: nutritionData.calories || 0,
          carbohydrates: nutritionData.carbohydrates || 0,
          proteins: nutritionData.proteins || 0,
          total_fat: nutritionData.total_fat || 0,
          saturated_fat: nutritionData.saturated_fat || 0,
          trans_fat: nutritionData.trans_fat || 0,
          fiber: nutritionData.fiber || 0,
          sodium: nutritionData.sodium || 0,
          portion_size: nutritionData.portion_size || "100g",
          disclaimer: nutritionData.disclaimer || "Informações nutricionais geradas automaticamente. Devem ser validadas pelo fabricante.",
        });
        updateStep("nutrition", "completed", `Tabela nutricional gerada (${nutritionData.source || "IA"})`);
      } else if (nutritionResult.status === "fulfilled") {
        updateStep("nutrition", "completed", "Produto detectado - nutrição pendente de revisão");
      } else {
        updateStep("nutrition", "error", "Não foi possível gerar automaticamente");
      }

      setProcessingProgress(100);
      setIsDialogOpen(true);
      toast.success("Processamento completo! Revise os dados gerados.");
      
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao processar arquivo");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error("Preço deve ser maior que zero");
      return;
    }

    setIsSaving(true);
    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        long_description: formData.long_description.trim() || null,
        price: parseFloat(formData.price),
        image_url: uploadedImageUrl,
        category: formData.category.trim() || null,
        badges: formData.badges.split(",").map(b => b.trim()).filter(Boolean),
        is_active: formData.is_active,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 5,
        rating: 5.0,
        reviews: 0,
        nutritional_info: nutritionalInfo ? {
          calories: nutritionalInfo.calories,
          carbohydrates: nutritionalInfo.carbohydrates,
          proteins: nutritionalInfo.proteins,
          total_fat: nutritionalInfo.total_fat,
          saturated_fat: nutritionalInfo.saturated_fat,
          trans_fat: nutritionalInfo.trans_fat,
          fiber: nutritionalInfo.fiber,
          sodium: nutritionalInfo.sodium,
          portion_size: nutritionalInfo.portion_size,
          disclaimer: nutritionalInfo.disclaimer,
        } : null,
      };

      const { error } = await supabase.from("products").insert(productData);
      if (error) throw error;

      toast.success("Produto criado com sucesso!");
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Erro ao salvar produto");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setPreviewUrl(null);
    setUploadedImageUrl(null);
    setAiData(null);
    setNutritionalInfo(null);
    setPlatformOutputs([]);
    setFileAnalysis(null);
    setProcessingProgress(0);
    setProcessingSteps([]);
    setFormData({
      name: "",
      description: "",
      long_description: "",
      category: "",
      badges: "",
      price: "",
      is_active: true,
      stock_quantity: "50",
      low_stock_threshold: "5",
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getStepIcon = (status: ProcessingStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "processing":
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          Criador de Anúncios com IA
        </h2>
        <p className="text-muted-foreground">
          Envie qualquer arquivo e a IA adapta automaticamente para todas as plataformas
        </p>
      </div>

      {/* Main Upload Area */}
      <Card className="border-dashed border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div 
            className="flex flex-col items-center justify-center py-12 cursor-pointer hover:bg-primary/10 rounded-lg transition-all duration-300"
            onClick={() => !isProcessing && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isProcessing}
            />
            
            {isProcessing ? (
              <div className="text-center w-full max-w-md space-y-6">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                
                <div className="space-y-2">
                  <p className="text-lg font-medium">Processamento Automático em Andamento</p>
                  <Progress value={processingProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground">{processingProgress}% concluído</p>
                </div>

                <div className="space-y-3 text-left bg-background/50 rounded-lg p-4">
                  {processingSteps.map((step) => (
                    <div key={step.id} className="flex items-center gap-3">
                      {getStepIcon(step.status)}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${step.status === "completed" ? "text-green-600" : step.status === "error" ? "text-destructive" : ""}`}>
                          {step.label}
                        </p>
                        {step.message && (
                          <p className="text-xs text-muted-foreground">{step.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : previewUrl ? (
              <div className="text-center space-y-4">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="max-h-48 rounded-lg shadow-md mx-auto"
                />
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); resetForm(); }}>
                    <X className="h-4 w-4 mr-2" />
                    Remover
                  </Button>
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); setIsDialogOpen(true); }}>
                    <Check className="h-4 w-4 mr-2" />
                    Ver Resultado
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center mb-4 shadow-lg">
                  <Upload className="h-10 w-10 text-white" />
                </div>
                <p className="text-xl font-semibold mb-2">Arraste ou clique para enviar</p>
                <p className="text-muted-foreground mb-4">Imagens, vídeos ou PDFs até 20MB</p>
                
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  <Badge variant="secondary" className="gap-1">
                    <Image className="h-3 w-3" /> Fotos
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <FileText className="h-3 w-3" /> PDFs
                  </Badge>
                  <Badge variant="outline">Instagram</Badge>
                  <Badge variant="outline">Facebook</Badge>
                  <Badge variant="outline">Google Ads</Badge>
                  <Badge variant="outline">Marketplace</Badge>
                </div>

                <div className="mt-6 p-4 bg-primary/10 rounded-lg max-w-lg">
                  <p className="text-sm text-center">
                    <Sparkles className="h-4 w-4 inline mr-1" />
                    A IA irá <strong>automaticamente</strong>: identificar o produto, adaptar para todas as plataformas e gerar informações nutricionais
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Anúncio Gerado Automaticamente
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="product" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="product" className="gap-2">
                <Wand2 className="h-4 w-4" />
                Produto
              </TabsTrigger>
              <TabsTrigger value="platforms" className="gap-2">
                <Image className="h-4 w-4" />
                Plataformas ({platformOutputs.length})
              </TabsTrigger>
              <TabsTrigger value="nutrition" className="gap-2">
                <Utensils className="h-4 w-4" />
                Nutrição
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              {/* Product Tab */}
              <TabsContent value="product" className="space-y-4 m-0 pr-4">
                {previewUrl && (
                  <div className="flex justify-center">
                    <img src={previewUrl} alt="Produto" className="max-h-32 rounded-lg shadow" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Produto *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome do produto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="Ex: temperos"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição Curta</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição curta para o catálogo"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="long_description">Descrição Completa</Label>
                  <Textarea
                    id="long_description"
                    value={formData.long_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, long_description: e.target.value }))}
                    placeholder="Descrição detalhada do produto"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço (R$) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="29.90"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">Estoque</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="threshold">Estoque Mínimo</Label>
                    <Input
                      id="threshold"
                      type="number"
                      value={formData.low_stock_threshold}
                      onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="badges">Badges (separados por vírgula)</Label>
                  <Input
                    id="badges"
                    value={formData.badges}
                    onChange={(e) => setFormData(prev => ({ ...prev, badges: e.target.value }))}
                    placeholder="Orgânico, Sem Glúten, Premium"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Produto Ativo</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>
              </TabsContent>

              {/* Platforms Tab */}
              <TabsContent value="platforms" className="space-y-4 m-0 pr-4">
                {fileAnalysis && (
                  <Card className="bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Análise da Imagem
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {fileAnalysis.detected_content && (
                        <p><strong>Conteúdo:</strong> {fileAnalysis.detected_content}</p>
                      )}
                      {fileAnalysis.quality_score && (
                        <p><strong>Qualidade:</strong> {fileAnalysis.quality_score}/10</p>
                      )}
                      {fileAnalysis.dominant_colors && (
                        <div className="flex items-center gap-2">
                          <strong>Cores:</strong>
                          {fileAnalysis.dominant_colors.map((color, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4">
                  {platformOutputs.map((output, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{output.platform}</CardTitle>
                          <Badge variant="outline">
                            {output.dimensions.width}x{output.dimensions.height}
                          </Badge>
                        </div>
                        <CardDescription>Proporção {output.aspectRatio}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="text-sm space-y-1">
                          {output.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {platformOutputs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma adaptação de plataforma disponível</p>
                  </div>
                )}
              </TabsContent>

              {/* Nutrition Tab */}
              <TabsContent value="nutrition" className="space-y-4 m-0 pr-4">
                {nutritionalInfo ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Utensils className="h-4 w-4" />
                        Tabela Nutricional
                      </CardTitle>
                      <CardDescription>
                        Porção: {nutritionalInfo.portion_size}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <tbody>
                            <tr className="border-b bg-muted/50">
                              <td className="p-2 font-medium">Valor Energético</td>
                              <td className="p-2 text-right">{nutritionalInfo.calories} kcal</td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-2">Carboidratos</td>
                              <td className="p-2 text-right">{nutritionalInfo.carbohydrates}g</td>
                            </tr>
                            <tr className="border-b bg-muted/50">
                              <td className="p-2">Proteínas</td>
                              <td className="p-2 text-right">{nutritionalInfo.proteins}g</td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-2">Gorduras Totais</td>
                              <td className="p-2 text-right">{nutritionalInfo.total_fat}g</td>
                            </tr>
                            <tr className="border-b bg-muted/50">
                              <td className="p-2 pl-6">Gorduras Saturadas</td>
                              <td className="p-2 text-right">{nutritionalInfo.saturated_fat}g</td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-2 pl-6">Gorduras Trans</td>
                              <td className="p-2 text-right">{nutritionalInfo.trans_fat}g</td>
                            </tr>
                            <tr className="border-b bg-muted/50">
                              <td className="p-2">Fibra Alimentar</td>
                              <td className="p-2 text-right">{nutritionalInfo.fiber}g</td>
                            </tr>
                            <tr>
                              <td className="p-2">Sódio</td>
                              <td className="p-2 text-right">{nutritionalInfo.sodium}mg</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {nutritionalInfo.disclaimer && (
                        <p className="text-xs text-muted-foreground mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-900">
                          ⚠️ {nutritionalInfo.disclaimer}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Utensils className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Informações nutricionais não disponíveis</p>
                    <p className="text-sm mt-2">Você pode adicioná-las manualmente depois de salvar o produto</p>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProduct} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Criar Produto
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIProductCreator;
