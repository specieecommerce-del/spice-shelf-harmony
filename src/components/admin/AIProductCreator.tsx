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
import { Loader2, Upload, Sparkles, Check, X, ImageIcon, Wand2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

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

const AIProductCreator = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [aiData, setAiData] = useState<AIProductData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable form data (initialized from AI)
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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione apenas imagens");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to storage
    setIsAnalyzing(true);
    try {
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

      // Analyze with AI
      toast.info("Analisando imagem com IA...");
      
      // Convert to base64 for AI analysis
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("ai-product-analyzer", {
        body: { imageBase64: base64 },
      });

      if (error) throw error;

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

      setIsDialogOpen(true);
      toast.success("Análise concluída! Revise os dados gerados.");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao processar imagem");
    } finally {
      setIsAnalyzing(false);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Criação de Produto com IA
        </h2>
        <p className="text-muted-foreground">
          Envie uma foto do produto e a IA irá gerar automaticamente nome, descrição e categoria
        </p>
      </div>

      <Card className="border-dashed border-2">
        <CardContent className="pt-6">
          <div 
            className="flex flex-col items-center justify-center py-12 cursor-pointer hover:bg-secondary/50 rounded-lg transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isAnalyzing}
            />
            
            {isAnalyzing ? (
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-lg font-medium">Analisando imagem...</p>
                <p className="text-sm text-muted-foreground">A IA está identificando o produto</p>
              </div>
            ) : previewUrl ? (
              <div className="text-center">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="max-h-48 rounded-lg shadow-md mx-auto mb-4"
                />
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); resetForm(); }}>
                  <X className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              </div>
            ) : (
              <>
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Wand2 className="h-8 w-8 text-primary" />
                </div>
                <p className="text-lg font-medium mb-2">Clique para enviar uma foto</p>
                <p className="text-sm text-muted-foreground">PNG, JPG até 5MB</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions Preview */}
      {aiData && !isDialogOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Sugestões da IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Nome</Label>
                <p className="font-medium">{aiData.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Categoria</Label>
                <p className="font-medium">{aiData.category}</p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Badges</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {aiData.badges.map((badge, i) => (
                  <Badge key={i} variant="secondary">{badge}</Badge>
                ))}
              </div>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="w-full">
              <Check className="h-4 w-4 mr-2" />
              Revisar e Salvar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Revisar Produto Gerado
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
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
                rows={4}
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

            {/* AI Tips */}
            {aiData && (aiData.nutritional_highlights?.length > 0 || aiData.usage_tips?.length > 0) && (
              <Card className="bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Dicas da IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {aiData.nutritional_highlights?.length > 0 && (
                    <div>
                      <p className="font-medium text-xs text-muted-foreground">Benefícios:</p>
                      <ul className="list-disc list-inside">
                        {aiData.nutritional_highlights.map((h, i) => <li key={i}>{h}</li>)}
                      </ul>
                    </div>
                  )}
                  {aiData.usage_tips?.length > 0 && (
                    <div>
                      <p className="font-medium text-xs text-muted-foreground">Uso:</p>
                      <ul className="list-disc list-inside">
                        {aiData.usage_tips.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProduct} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Salvar Produto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIProductCreator;
