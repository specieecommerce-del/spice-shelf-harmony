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

<<<<<<< HEAD
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
=======
const FIXED_WEBHOOK_URL = "https://speciesalimentos.com.br/_functions/asaas-webhook?token=$aeact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjY3OTgyYWQ1LTkzOGYtNDk3Mi1hYzViLTI0YTRlZGNiYzUwNzo6JGFlYWNoXzg4MDljNzQ4LTUzMWQtNDUwNi05OGFjLTNiODE2YjgzZjczOA==";
>>>>>>> 41cb06f7524bc03209ba1b98827d1ec764f687e6

const BoletoSettingsManager = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
<<<<<<< HEAD
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
      environment: "homolog",
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
=======
  const [enabled, setEnabled] = useState(true);
  const [daysToExpire, setDaysToExpire] = useState(3);
  const [instructions, setInstructions] = useState("");
  const [webhookEmail, setWebhookEmail] = useState("specieecommerce@gmail.com");
  const [webhookInfo, setWebhookInfo] = useState<Record<string, unknown> | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
>>>>>>> 41cb06f7524bc03209ba1b98827d1ec764f687e6

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
<<<<<<< HEAD
      const { data, error } = await supabase.functions.invoke("boleto-settings", {
        body: { action: "get_boleto" },
      });

      if (error) throw error;

      if (data?.settings) {
        setSettings(data.settings);
        setMode("manual");
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const isLogged = Boolean(sessionData?.session);
      if (isLogged) {
        const regRes = await supabase.functions.invoke("admin-boleto-registered-settings", {
          body: { action: "get_settings" },
        });
        if (regRes.error) {
          const msg = typeof regRes.error === "object" && (regRes.error as any).message ? (regRes.error as any).message : "";
          if (msg.includes("Não autorizado") || msg.includes("Acesso negado")) {
            toast.error("Faça login como administrador para editar Boleto Registrado");
          }
        }
        if (regRes.data?.settings) {
          const s = regRes.data.settings as RegisteredSettings;
          setRegSettings({
            enabled: s.enabled ?? true,
            provider: s.provider ?? "",
            bank: {
              code: s.bank?.code ?? "",
              name: s.bank?.name ?? "",
              wallet: s.bank?.wallet ?? "",
              agreement: s.bank?.agreement ?? "",
              agency: s.bank?.agency ?? "",
              account: s.bank?.account ?? "",
              account_dv: s.bank?.account_dv ?? "",
              beneficiary_name: s.bank?.beneficiary_name ?? "",
              beneficiary_document: s.bank?.beneficiary_document ?? "",
            },
            api: {
              type: s.api?.type ?? "cnab",
              environment: s.api?.environment ?? "homolog",
              endpoint: s.api?.endpoint ?? "",
              client_id: s.api?.client_id ?? "",
              client_secret: "",
              certificate_ref: s.api?.certificate_ref ?? "",
            },
            billing: {
              days_to_expire: s.billing?.days_to_expire ?? 3,
              fine_percent: s.billing?.fine_percent ?? 0,
              interest_percent_month: s.billing?.interest_percent_month ?? 0,
              instructions: s.billing?.instructions ?? "",
            },
          });
          setMode("asaas");
        }
      } else {
        toast.error("Sessão não encontrada. Faça login para editar Boleto Registrado.");
      }
    } catch (error) {
      try {
        const { data: row } = await supabase
          .from("store_settings")
          .select("value")
          .eq("key", "boleto_settings")
          .maybeSingle();
        const v = (row?.value ?? null) as Record<string, unknown> | null;
        if (v) {
          setSettings({
            bank_code: String(v["manual"]?.["bank_code"] || ""),
            bank_name: String(v["manual"]?.["bank_name"] || ""),
            agency: String(v["manual"]?.["agency"] || ""),
            account: String(v["manual"]?.["account"] || ""),
            account_type: String(v["manual"]?.["account_type"] || "corrente"),
            beneficiary_name: String(v["manual"]?.["beneficiary_name"] || ""),
            beneficiary_document: String(v["manual"]?.["beneficiary_document"] || ""),
            instructions: String(v["manual"]?.["instructions"] || "Após efetuar o pagamento, envie o comprovante por WhatsApp ou email."),
            days_to_expire: Number(v["manual"]?.["days_to_expire"] || 3),
          });
          setMode(String(v["mode"] || "manual") as Mode);
        }
      } catch (e) {
        console.error("Error fetching boleto settings:", e);
=======
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
>>>>>>> 41cb06f7524bc03209ba1b98827d1ec764f687e6
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
<<<<<<< HEAD
          bank_code: settings.bank_code.trim(),
          bank_name: bankName,
          agency: settings.agency.trim(),
          account: settings.account.trim(),
          account_type: settings.account_type || "corrente",
          beneficiary_name: settings.beneficiary_name.trim(),
          beneficiary_document: settings.beneficiary_document.trim(),
          instructions: settings.instructions || "",
          days_to_expire: settings.days_to_expire || 3,
        };
        const { data, error } = await supabase.functions.invoke("boleto-settings", {
          body: payload,
        });
        if (error) {
          const msg = typeof error === "object" && (error as any).message ? (error as any).message : "Erro de conexão com o servidor";
          toast.error(msg);
          return;
        }
        if (data?.error) throw new Error(data.error);
      }

=======
          mode: "asaas",
          enabled,
          days_to_expire: daysToExpire,
          instructions,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
>>>>>>> 41cb06f7524bc03209ba1b98827d1ec764f687e6
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
<<<<<<< HEAD
          <div className="space-y-2">
            <Label>Modo</Label>
            <Select value={mode} onValueChange={(m) => setMode(m as Mode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="asaas">Registrado (Asaas)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Bank Selection */}
          {mode === "asaas" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="space-y-1">
                  <p className={`font-medium ${regSettings.enabled ? "text-green-700" : "text-amber-700"}`}>
                    {regSettings.enabled ? "Boleto (Asaas) ativado" : "Boleto (Asaas) desativado"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ative para receber pagamentos com emissão registrada
                  </p>
                </div>
                <Switch checked={regSettings.enabled} onCheckedChange={(checked) => setRegSettings((prev) => ({ ...prev, enabled: checked }))} />
              </div>
              {/* Asaas não precisa de credenciais na UI; parâmetros de boleto abaixo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="webhookUrl">Webhook Asaas</Label>
                  <Input id="webhookUrl" value={`${window.location.origin}/_functions/asaas-webhook`} disabled />
                  <p className="text-xs text-muted-foreground">
                    O token é gerenciado no servidor; o URL receberá ?token= automaticamente
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhookEmail">Email (opcional)</Label>
                  <Input
                    id="webhookEmail"
                    value={webhookEmail}
                    onChange={(e) => setWebhookEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const { data: sessionData } = await supabase.auth.getSession();
                      if (!sessionData?.session) {
                        sonnerToast.error("Sessão expirada. Faça login como administrador.");
                        return;
                      }
                      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                      const { data, error } = await supabase.functions.invoke("asaas-webhook-register", {
                        body: {
                          url: `${supabaseUrl}/functions/v1/asaas-webhook`,
                          email: webhookEmail,
                          sendType: "SEQUENTIALLY",
                          name: "BOLETO SPECIES ALIMENTOS",
                        },
                      });
                      if (error || data?.error) {
                        sonnerToast.error(data?.error || "Falha ao registrar webhook");
                        setWebhookInfo(null);
                        return;
                      }
                      sonnerToast.success("Webhook Asaas registrado!");
                      setWebhookInfo(data?.data ?? null);
                    } catch (err) {
                      sonnerToast.error("Erro ao registrar webhook");
                    }
                  }}
                >
                  Registrar webhook Asaas
                </Button>
              </div>
              {webhookInfo && (
                <div className="mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-2 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground text-xs">Nome</p>
                          <p className="font-medium">{String(webhookInfo["name"] ?? "")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Envio</p>
                          <p className="font-medium">{String(webhookInfo["sendType"] ?? "")}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-muted-foreground text-xs">URL</p>
                          <p className="font-medium break-all">{String(webhookInfo["url"] ?? "")}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
=======
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
>>>>>>> 41cb06f7524bc03209ba1b98827d1ec764f687e6
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

<<<<<<< HEAD
          {/* Account Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agency">Agência *</Label>
              <Input
                id="agency"
                value={mode === "asaas" ? "" : settings.agency}
                disabled={mode === "asaas"}
                onChange={(e) => {
                  if (mode !== "asaas") {
                    setSettings({ ...settings, agency: e.target.value });
                  }
                }}
                placeholder="0001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Conta *</Label>
              <Input
                id="account"
                value={mode === "asaas" ? "" : settings.account}
                disabled={mode === "asaas"}
                onChange={(e) => {
                  if (mode !== "asaas") {
                    setSettings({ ...settings, account: e.target.value });
                  }
                }}
                placeholder="12345-6"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_type">Tipo de Conta</Label>
              <Select
                value={mode === "asaas" ? "corrente" : settings.account_type}
                disabled={mode === "asaas"}
                onValueChange={(value) => {
                  if (mode !== "asaas") {
                    setSettings({ ...settings, account_type: value });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrente">Conta Corrente</SelectItem>
                  <SelectItem value="poupanca">Poupança</SelectItem>
                  <SelectItem value="pagamento">Conta Pagamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {mode !== "asaas" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_dv">Dígito da Conta</Label>
                <Input
                  id="account_dv"
                  value={settings.account}
                  onChange={(e) => setSettings({ ...settings, account: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wallet">Carteira</Label>
                <Input
                  id="wallet"
                  value=""
                  onChange={() => {}}
                  placeholder="Ex.: 17"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agreement">Convênio</Label>
                <Input
                  id="agreement"
                  value=""
                  onChange={() => {}}
                  placeholder="Ex.: 123456"
                />
              </div>
            </div>
          )}

          {/* Beneficiary Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="beneficiary_name">Nome do Favorecido *</Label>
              <Input
                id="beneficiary_name"
                value={mode === "asaas" ? "" : settings.beneficiary_name}
                disabled={mode === "asaas"}
                onChange={(e) => {
                  if (mode !== "asaas") {
                    setSettings({ ...settings, beneficiary_name: e.target.value });
                  }
                }}
                placeholder="Nome completo ou razão social"
              />
              {mode === "asaas" && (
                <p className="text-xs text-muted-foreground">
                  Asaas não requer dados do favorecido aqui
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="beneficiary_document">CPF/CNPJ *</Label>
              <Input
                id="beneficiary_document"
                value={mode === "asaas" ? "" : settings.beneficiary_document}
                disabled={mode === "asaas"}
                onChange={(e) => {
                  if (mode !== "asaas") {
                    setSettings({ ...settings, beneficiary_document: e.target.value });
                  }
                }}
                placeholder="000.000.000-00 ou 00.000.000/0001-00"
              />
              {mode === "asaas" && (
                <p className="text-xs text-muted-foreground">
                  Asaas identifica o pagador no próprio boleto
                </p>
              )}
            </div>
          </div>

          {/* Instructions */}
=======
>>>>>>> 41cb06f7524bc03209ba1b98827d1ec764f687e6
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
