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
      }
    } catch (error) {
      console.error("Error fetching boleto settings:", error);
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
    if (!settings.bank_code || !settings.agency || !settings.account || !settings.beneficiary_name || !settings.beneficiary_document) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSaving(true);
    try {
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
        console.error("Edge function error:", error);
        const msg = typeof error === "object" && error.message ? error.message : "Erro de conexão com o servidor";
        toast.error(msg);
        return;
      }

      if (data?.success) {
        toast.success("Configurações de boleto salvas!");
      } else {
        const errMsg = data?.error || "Erro desconhecido ao salvar";
        console.error("Save boleto response error:", data);
        toast.error(errMsg);
      }
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
          {/* Bank Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_code">Código do Banco *</Label>
              <Select
                value={settings.bank_code}
                onValueChange={handleBankCodeChange}
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
                value={settings.bank_name}
                onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
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
                value={settings.agency}
                onChange={(e) => setSettings({ ...settings, agency: e.target.value })}
                placeholder="0001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Conta *</Label>
              <Input
                id="account"
                value={settings.account}
                onChange={(e) => setSettings({ ...settings, account: e.target.value })}
                placeholder="12345-6"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_type">Tipo de Conta</Label>
              <Select
                value={settings.account_type}
                onValueChange={(value) => setSettings({ ...settings, account_type: value })}
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

          {/* Beneficiary Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="beneficiary_name">Nome do Favorecido *</Label>
              <Input
                id="beneficiary_name"
                value={settings.beneficiary_name}
                onChange={(e) => setSettings({ ...settings, beneficiary_name: e.target.value })}
                placeholder="Nome completo ou razão social"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="beneficiary_document">CPF/CNPJ *</Label>
              <Input
                id="beneficiary_document"
                value={settings.beneficiary_document}
                onChange={(e) => setSettings({ ...settings, beneficiary_document: e.target.value })}
                placeholder="000.000.000-00 ou 00.000.000/0001-00"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Instruções para o cliente</Label>
            <Textarea
              id="instructions"
              value={settings.instructions}
              onChange={(e) => setSettings({ ...settings, instructions: e.target.value })}
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
              value={settings.days_to_expire}
              onChange={(e) => setSettings({ ...settings, days_to_expire: parseInt(e.target.value) || 3 })}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Prazo para o cliente efetuar o pagamento
            </p>
          </div>

          {/* Preview */}
          {settings.bank_code && settings.beneficiary_name && (
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
