import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, Save, Building2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

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

type Mode = "manual" | "registered";
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

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("boleto-settings", {
        body: { action: "get_boleto" },
      });

      if (error) throw error;

      if (data?.settings) {
        setSettings(data.settings);
        setMode("manual");
      }
      const regRes = await supabase.functions.invoke("admin-boleto-registered-settings", {
        body: { action: "get_settings" },
      });
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
        setMode("registered");
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
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBankCodeChange = (code: string) => {
    setSettings((prev) => ({
      ...prev,
      bank_code: code,
      bank_name: COMMON_BANKS[code] || prev.bank_name,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (mode === "registered") {
        const value: RegisteredSettings = {
          enabled: regSettings.enabled,
          provider: regSettings.provider,
          bank: regSettings.bank,
          api: regSettings.api,
          billing: regSettings.billing,
        };
        const { data, error } = await supabase.functions.invoke("admin-boleto-registered-settings", {
          body: { action: "save_settings", value: { ...value, mode: "registered" } },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      } else {
        if (!settings.bank_code || !settings.agency || !settings.account || !settings.beneficiary_name || !settings.beneficiary_document) {
          toast.error("Preencha todos os campos obrigatórios");
          return;
        }
        const payload = {
          action: "save_boleto",
          bank_code: settings.bank_code,
          bank_name: settings.bank_name || COMMON_BANKS[settings.bank_code] || settings.bank_code,
          agency: settings.agency,
          account: settings.account,
          account_type: settings.account_type || "corrente",
          beneficiary_name: settings.beneficiary_name,
          beneficiary_document: settings.beneficiary_document,
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

      toast.success("Configurações salvas!");
    } catch (error: any) {
      console.error("Error saving boleto settings:", error);
      toast.error(error?.message || "Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
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
            Configurações de Boleto/Depósito
          </CardTitle>
          <CardDescription>
            Configure os dados bancários para receber pagamentos via depósito ou transferência
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Modo</Label>
            <Select value={mode} onValueChange={(m) => setMode(m as Mode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="registered">Registrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Bank Selection */}
          {mode === "registered" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="space-y-1">
                  <p className={`font-medium ${regSettings.enabled ? "text-green-700" : "text-amber-700"}`}>
                    {regSettings.enabled ? "Boleto Registrado ativado" : "Boleto Registrado desativado"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ative para receber pagamentos com emissão registrada
                  </p>
                </div>
                <Switch checked={regSettings.enabled} onCheckedChange={(checked) => setRegSettings((prev) => ({ ...prev, enabled: checked }))} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provedor</Label>
                  <Input
                    value={regSettings.provider}
                    onChange={(e) => setRegSettings((prev) => ({ ...prev, provider: e.target.value }))}
                    placeholder="Ex.: bank_bradesco, api_pagseguro"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Integração</Label>
                  <Select
                    value={regSettings.api.type}
                    onValueChange={(val) => setRegSettings((prev) => ({ ...prev, api: { ...prev.api, type: val as RegisteredSettings['api']['type'] } }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cnab">CNAB</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Select
                    value={regSettings.api.environment}
                    onValueChange={(val) => setRegSettings((prev) => ({ ...prev, api: { ...prev.api, environment: val as RegisteredSettings['api']['environment'] } }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homolog">Homologação</SelectItem>
                      <SelectItem value="production">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Endpoint da API</Label>
                  <Input
                    value={regSettings.api.endpoint}
                    onChange={(e) => setRegSettings((prev) => ({ ...prev, api: { ...prev.api, endpoint: e.target.value } }))}
                    placeholder="https://api.exemplo.com/boletos"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client ID</Label>
                  <Input
                    value={regSettings.api.client_id}
                    onChange={(e) => setRegSettings((prev) => ({ ...prev, api: { ...prev.api, client_id: e.target.value } }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client Secret</Label>
                  <Input
                    type="password"
                    value={regSettings.api.client_secret}
                    onChange={(e) => setRegSettings((prev) => ({ ...prev, api: { ...prev.api, client_secret: e.target.value } }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Certificate Ref</Label>
                  <Input
                    value={regSettings.api.certificate_ref}
                    onChange={(e) => setRegSettings((prev) => ({ ...prev, api: { ...prev.api, certificate_ref: e.target.value } }))}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_code">Código do Banco *</Label>
              <Select
                value={mode === "registered" ? regSettings.bank.code : settings.bank_code}
                onValueChange={(code) => {
                  if (mode === "registered") {
                    setRegSettings((prev) => ({ ...prev, bank: { ...prev.bank, code, name: COMMON_BANKS[code] || prev.bank.name } }));
                  } else {
                    handleBankCodeChange(code);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COMMON_BANKS).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {code} - {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_name">Nome do Banco</Label>
              <Input
                id="bank_name"
                value={mode === "registered" ? regSettings.bank.name : settings.bank_name}
                onChange={(e) => {
                  if (mode === "registered") {
                    setRegSettings((prev) => ({ ...prev, bank: { ...prev.bank, name: e.target.value } }));
                  } else {
                    setSettings({ ...settings, bank_name: e.target.value });
                  }
                }}
                placeholder="Nome do banco"
              />
            </div>
          </div>

          {/* Account Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agency">Agência *</Label>
              <Input
                id="agency"
                value={mode === "registered" ? regSettings.bank.agency : settings.agency}
                onChange={(e) => {
                  if (mode === "registered") {
                    setRegSettings((prev) => ({ ...prev, bank: { ...prev.bank, agency: e.target.value } }));
                  } else {
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
                value={mode === "registered" ? regSettings.bank.account : settings.account}
                onChange={(e) => {
                  if (mode === "registered") {
                    setRegSettings((prev) => ({ ...prev, bank: { ...prev.bank, account: e.target.value } }));
                  } else {
                    setSettings({ ...settings, account: e.target.value });
                  }
                }}
                placeholder="12345-6"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_type">Tipo de Conta</Label>
              <Select
                value={mode === "registered" ? "corrente" : settings.account_type}
                onValueChange={(value) => {
                  if (mode === "registered") {
                    // keep corrente for registered
                  } else {
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
          {mode === "registered" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_dv">Dígito da Conta</Label>
                <Input
                  id="account_dv"
                  value={regSettings.bank.account_dv}
                  onChange={(e) => setRegSettings((prev) => ({ ...prev, bank: { ...prev.bank, account_dv: e.target.value } }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wallet">Carteira</Label>
                <Input
                  id="wallet"
                  value={regSettings.bank.wallet}
                  onChange={(e) => setRegSettings((prev) => ({ ...prev, bank: { ...prev.bank, wallet: e.target.value } }))}
                  placeholder="Ex.: 17"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agreement">Convênio</Label>
                <Input
                  id="agreement"
                  value={regSettings.bank.agreement}
                  onChange={(e) => setRegSettings((prev) => ({ ...prev, bank: { ...prev.bank, agreement: e.target.value } }))}
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
                value={mode === "registered" ? regSettings.bank.beneficiary_name : settings.beneficiary_name}
                onChange={(e) => {
                  if (mode === "registered") {
                    setRegSettings((prev) => ({ ...prev, bank: { ...prev.bank, beneficiary_name: e.target.value } }));
                  } else {
                    setSettings({ ...settings, beneficiary_name: e.target.value });
                  }
                }}
                placeholder="Nome completo ou razão social"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="beneficiary_document">CPF/CNPJ *</Label>
              <Input
                id="beneficiary_document"
                value={mode === "registered" ? regSettings.bank.beneficiary_document : settings.beneficiary_document}
                onChange={(e) => {
                  if (mode === "registered") {
                    setRegSettings((prev) => ({ ...prev, bank: { ...prev.bank, beneficiary_document: e.target.value } }));
                  } else {
                    setSettings({ ...settings, beneficiary_document: e.target.value });
                  }
                }}
                placeholder="000.000.000-00 ou 00.000.000/0001-00"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Instruções para o cliente</Label>
            <Textarea
              id="instructions"
              value={mode === "registered" ? regSettings.billing.instructions : settings.instructions}
              onChange={(e) => {
                if (mode === "registered") {
                  setRegSettings((prev) => ({ ...prev, billing: { ...prev.billing, instructions: e.target.value } }));
                } else {
                  setSettings({ ...settings, instructions: e.target.value });
                }
              }}
              placeholder="Instruções que aparecerão para o cliente..."
              rows={3}
            />
          </div>

          {/* Days to Expire */}
          <div className="space-y-2">
            <Label htmlFor="days_to_expire">Dias para vencimento</Label>
            <Input
              id="days_to_expire"
              type="number"
              min="1"
              max="30"
              value={mode === "registered" ? regSettings.billing.days_to_expire : settings.days_to_expire}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 3;
                if (mode === "registered") {
                  setRegSettings((prev) => ({ ...prev, billing: { ...prev.billing, days_to_expire: v } }));
                } else {
                  setSettings({ ...settings, days_to_expire: v });
                }
              }}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Prazo para o cliente efetuar o pagamento
            </p>
          </div>
          {mode === "registered" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fine_percent">Multa (%)</Label>
                <Input
                  id="fine_percent"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={regSettings.billing.fine_percent}
                  onChange={(e) =>
                    setRegSettings((prev) => ({
                      ...prev,
                      billing: { ...prev.billing, fine_percent: parseFloat(e.target.value) || 0 },
                    }))
                  }
                  className="w-32"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interest_month">Juros ao mês (%)</Label>
                <Input
                  id="interest_month"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={regSettings.billing.interest_percent_month}
                  onChange={(e) =>
                    setRegSettings((prev) => ({
                      ...prev,
                      billing: { ...prev.billing, interest_percent_month: parseFloat(e.target.value) || 0 },
                    }))
                  }
                  className="w-32"
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {mode === "manual" && settings.bank_code && settings.beneficiary_name && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-4 w-4" />
                Prévia dos dados bancários
              </div>
              <div className="text-sm space-y-1">
                <p><strong>Banco:</strong> {settings.bank_name} ({settings.bank_code})</p>
                <p><strong>Agência:</strong> {settings.agency}</p>
                <p><strong>Conta:</strong> {settings.account} ({settings.account_type})</p>
                <p><strong>Favorecido:</strong> {settings.beneficiary_name}</p>
                <p><strong>CPF/CNPJ:</strong> {settings.beneficiary_document}</p>
              </div>
            </div>
          )}

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BoletoSettingsManager;
