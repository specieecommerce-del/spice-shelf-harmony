import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save, Mail, Gift, Trash2, Plus, RotateCcw } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface NewsletterContent {
  title: string;
  description: string;
  discount_percentage: number;
  benefits: string[];
  privacy_note: string;
  button_text: string;
  auto_coupon_enabled: boolean;
  auto_coupon_code: string;
  auto_coupon_discount: number;
  auto_coupon_message: string;
}

const defaultContent: NewsletterContent = {
  title: "Ganhe 10% de Desconto",
  description: "Inscreva-se em nossa newsletter e receba um cupom exclusivo de 10% off + receitas semanais direto no seu e-mail!",
  discount_percentage: 10,
  benefits: ["Cupom de 10% off", "Receitas exclusivas", "Ofertas antecipadas"],
  privacy_note: "Respeitamos sua privacidade. Cancele a qualquer momento.",
  button_text: "Inscrever",
  auto_coupon_enabled: false,
  auto_coupon_code: "BEMVINDO10",
  auto_coupon_discount: 10,
  auto_coupon_message: "Obrigado por se inscrever! Aqui está seu cupom exclusivo de desconto:",
};

const NewsletterManager = () => {
  const [content, setContent] = useState<NewsletterContent>(defaultContent);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const { data, error } = await supabase
        .from("site_content")
        .select("content")
        .eq("section", "newsletter")
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data?.content && typeof data.content === 'object' && !Array.isArray(data.content)) {
        setContent({ ...defaultContent, ...(data.content as unknown as NewsletterContent) });
      }
    } catch (error) {
      console.error("Error loading newsletter content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveContent = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("site_content")
        .upsert(
          { section: "newsletter", content: content as unknown as Json }
        );

      if (error) throw error;
      toast.success("Configurações da newsletter salvas!");
    } catch (error) {
      console.error("Error saving newsletter content:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = () => {
    setContent(defaultContent);
    toast.success("Configurações restauradas. Clique em Salvar para confirmar.");
  };

  const addBenefit = () => {
    setContent((prev) => ({
      ...prev,
      benefits: [...prev.benefits, ""],
    }));
  };

  const updateBenefit = (index: number, value: string) => {
    setContent((prev) => ({
      ...prev,
      benefits: prev.benefits.map((b, i) => (i === index ? value : b)),
    }));
  };

  const removeBenefit = (index: number) => {
    setContent((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
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
        <h2 className="text-2xl font-bold">Newsletter</h2>
        <p className="text-muted-foreground">
          Configure a seção de newsletter e o cupom automático por e-mail
        </p>
      </div>

      {/* Newsletter Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Exibição da Newsletter
          </CardTitle>
          <CardDescription>
            Configure como a newsletter aparece no site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Título</Label>
              <Input
                value={content.title}
                onChange={(e) => setContent((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ganhe 10% de Desconto"
              />
            </div>
            <div>
              <Label>Texto do Botão</Label>
              <Input
                value={content.button_text}
                onChange={(e) => setContent((prev) => ({ ...prev, button_text: e.target.value }))}
                placeholder="Inscrever"
              />
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={content.description}
              onChange={(e) => setContent((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Inscreva-se em nossa newsletter..."
            />
          </div>

          <div>
            <Label>Nota de Privacidade</Label>
            <Input
              value={content.privacy_note}
              onChange={(e) => setContent((prev) => ({ ...prev, privacy_note: e.target.value }))}
              placeholder="Respeitamos sua privacidade..."
            />
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <Label>Benefícios Listados</Label>
            {content.benefits.map((benefit, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={benefit}
                  onChange={(e) => updateBenefit(index, e.target.value)}
                  placeholder="Ex: Cupom de 10% off"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBenefit(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addBenefit}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Benefício
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto Coupon Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Cupom Automático por E-mail
          </CardTitle>
          <CardDescription>
            Configure o envio automático de cupom quando o cliente se inscrever
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-base">Ativar Cupom Automático</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativado, um cupom será enviado automaticamente ao e-mail do cliente
              </p>
            </div>
            <Switch
              checked={content.auto_coupon_enabled}
              onCheckedChange={(checked) =>
                setContent((prev) => ({ ...prev, auto_coupon_enabled: checked }))
              }
            />
          </div>

          {content.auto_coupon_enabled && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Código do Cupom</Label>
                  <Input
                    value={content.auto_coupon_code}
                    onChange={(e) =>
                      setContent((prev) => ({
                        ...prev,
                        auto_coupon_code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="BEMVINDO10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Este cupom deve existir na tabela de cupons
                  </p>
                </div>
                <div>
                  <Label>Desconto (%)</Label>
                  <Input
                    type="number"
                    value={content.auto_coupon_discount}
                    onChange={(e) =>
                      setContent((prev) => ({
                        ...prev,
                        auto_coupon_discount: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <Label>Mensagem do E-mail</Label>
                <Textarea
                  value={content.auto_coupon_message}
                  onChange={(e) =>
                    setContent((prev) => ({ ...prev, auto_coupon_message: e.target.value }))
                  }
                  rows={3}
                  placeholder="Obrigado por se inscrever! Aqui está seu cupom..."
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={saveContent} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
        <Button variant="outline" onClick={resetToDefault}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar Padrão
        </Button>
      </div>
    </div>
  );
};

export default NewsletterManager;