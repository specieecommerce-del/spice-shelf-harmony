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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface BoletoSettings {
  bank_code: string;
  bank_name: string;
  agency: string;
  account: string;
  account_type: string;
  beneficiary_name: string;
  beneficiary_document: string;
  instructions: string;
  days_to_expire: number;
}

type Mode = "manual" | "asaas";
interface RegisteredSettings {
  enabled: boolean;
  provider: string;
  bank: {
    code: string;
    name: string;
    wallet: string;
    agreement: string;
    agency: string;
    account: string;
    account_dv: string;
    beneficiary_name: string;
    beneficiary_document: string;
  };
  api: {
    type: "cnab" | "api";
    environment: "homolog" | "production";
    endpoint: string;
    client_id: string;
    client_secret: string;
    certificate_ref: string;
  };
  billing: {
    days_to_expire: number;
    fine_percent: number;
    interest_percent_month: number;
    instructions: string;
  };
}

const COMMON_BANKS: Record<string, string> = {
  "001": "Banco do Brasil",
  "033": "Santander",
  "104": "Caixa Econômica Federal",
  "237": "Bradesco",
  "341": "Itaú",
  "260": "Nubank",
  "077": "Inter",
  "336": "C6 Bank",
  "212": "Banco Original",
  "756": "Sicoob",
  "748": "Sicredi",
  "422": "Safra",
  "655": "Neon",
  "290": "PagSeguro",
  "380": "PicPay",
  "323": "Mercado Pago",
};
const FIXED_WEBHOOK_URL = "https://speciesalimentos.com.br/_functions/asaas-webhook";

const BoletoSettingsManager = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<Mode>("manual");
  const [settings, setSettings] = useState<BoletoSettings>({
    bank_code: "",
    bank_name: "",
    agency: "",
    account: "",
    account_type: "corrente",
    beneficiary_name: "",
    beneficiary_document: "",
    instructions: "Após efetuar o pagamento, envie o comprovante por WhatsApp ou email.",
    days_to_expire: 3,
  });
  const [regSettings, setRegSettings] = useState<RegisteredSettings>({
    enabled: true,
    provider: "",
    bank: {
      code: "",
      name: "",
      wallet: "",
      agreement: "",
      agency: "",
      account: "",
      account_dv: "",
      beneficiary_name: "",
      beneficiary_document: "",
    },
    api: {
      type: "cnab",
      environment: "production",
      endpoint: "",
      client_id: "",
      client_secret: "",
      certificate_ref: "",
    },
    billing: {
      days_to_expire: 3,
      fine_percent: 0,
      interest_percent_month: 0,
      instructions: "",
    },
  });
  const [webhookEmail, setWebhookEmail] = useState<string>("specieecommerce@gmail.com");
  const [webhookInfo, setWebhookInfo] = useState<Record<string, unknown> | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [daysToExpire, setDaysToExpire] = useState(3);
  const [instructions, setInstructions] = useState("");
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
        const env = String(v["environment"] ?? regSettings.api.environment);
        setRegSettings((prev) => ({
          ...prev,
          api: { ...prev.api, environment: env === "production" ? "production" : "homolog" },
        }));
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
          environment: regSettings.api.environment,
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
          environment: regSettings.api.environment,
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

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook Asaas (fixo)</Label>
              <Input value={FIXED_WEBHOOK_URL} disabled />
              <p className="text-xs text-muted-foreground">URL fixa com token de autenticação embutido</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <Select
                  value={regSettings.api.environment === "production" ? "production" : "sandbox"}
                  onValueChange={(val) =>
                    setRegSettings((prev) => ({
                      ...prev,
                      api: { ...prev.api, environment: val === "production" ? "production" : "homolog" },
                    }))
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Produção</SelectItem>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="webhookEmail">Email de notificação (opcional)</Label>
                <Input id="webhookEmail" value={webhookEmail} onChange={(e) => setWebhookEmail(e.target.value)} />
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

          {/* Account Info REMOVED */}
          {/* Beneficiary Info REMOVED */}

          {/* Instructions */}
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
