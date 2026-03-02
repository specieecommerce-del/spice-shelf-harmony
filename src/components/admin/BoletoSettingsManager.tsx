import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, FileText, Save, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const FIXED_WEBHOOK_URL = "https://speciesalimentos.com.br/_functions/asaas-webhook?token=$aeact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjY3OTgyYWQ1LTkzOGYtNDk3Mi1hYzViLTI0YTRlZGNiYzUwNzo6JGFlYWNoXzg4MDljNzQ4LTUzMWQtNDUwNi05OGFjLTNiODE2YjgzZjczOA==";

const BoletoSettingsManager = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [daysToExpire, setDaysToExpire] = useState(3);
  const [instructions, setInstructions] = useState("");
  const [webhookEmail, setWebhookEmail] = useState("specieecommerce@gmail.com");
  const [webhookInfo, setWebhookInfo] = useState<Record<string, unknown> | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: row } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "boleto_settings")
        .maybeSingle();
      const v = (row?.value ?? null) as Record<string, unknown> | null;
      if (v) {
        setEnabled(Boolean(v["enabled"] ?? true));
        setDaysToExpire(Number(v["days_to_expire"] ?? 3));
        setInstructions(String(v["instructions"] ?? ""));
      }
    } catch (e) {
      console.error("Error fetching boleto settings:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("boleto-settings", {
        body: {
          action: "save_boleto",
          mode: "asaas",
          enabled,
          days_to_expire: daysToExpire,
          instructions,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Configurações salvas!");
    } catch (error: any) {
      console.error("Error saving boleto settings:", error);
      toast.error(error?.message || "Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegisterWebhook = async () => {
    setIsRegistering(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        toast.error("Sessão expirada. Faça login como administrador.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("asaas-webhook-register", {
        body: {
          url: FIXED_WEBHOOK_URL,
          email: webhookEmail,
          sendType: "SEQUENTIALLY",
          name: "BOLETO SPECIES ALIMENTOS",
        },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Falha ao registrar webhook");
        setWebhookInfo(null);
        return;
      }
      toast.success("Webhook Asaas registrado!");
      setWebhookInfo(data?.data ?? null);
    } catch (err) {
      toast.error("Erro ao registrar webhook");
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Boleto Registrado (Asaas)
          </CardTitle>
          <CardDescription>
            Emissão de boletos registrados via Asaas com confirmação automática por webhook
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="space-y-1">
              <p className={`font-medium ${enabled ? "text-green-700" : "text-amber-700"}`}>
                {enabled ? "Boleto ativado" : "Boleto desativado"}
              </p>
              <p className="text-sm text-muted-foreground">
                Ative para exibir a opção de boleto no checkout
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* Webhook */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook Asaas (fixo)</Label>
              <Input value="https://speciesalimentos.com.br/_functions/asaas-webhook" disabled />
              <p className="text-xs text-muted-foreground">
                URL fixa com token de autenticação embutido
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="webhookEmail">Email de notificação (opcional)</Label>
                <Input
                  id="webhookEmail"
                  value={webhookEmail}
                  onChange={(e) => setWebhookEmail(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={handleRegisterWebhook} disabled={isRegistering}>
                {isRegistering ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Registrando...</>
                ) : (
                  "Registrar Webhook Asaas"
                )}
              </Button>
            </div>

            {webhookInfo && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Webhook registrado com sucesso! URL: {String(webhookInfo["url"] ?? "")}
              </div>
            )}
          </div>

          {/* Billing Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="days_to_expire">Dias para vencimento</Label>
              <Input
                id="days_to_expire"
                type="number"
                min="1"
                max="30"
                value={daysToExpire}
                onChange={(e) => setDaysToExpire(parseInt(e.target.value) || 3)}
                className="w-32"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instruções para o cliente</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Instruções que aparecerão para o cliente..."
              rows={3}
            />
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Salvar Configurações</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BoletoSettingsManager;
