import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type PixKeyType = "cpf" | "cnpj" | "email" | "phone";

const PixSettingsManager = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pixSaved, setPixSaved] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("cpf");
  const [merchantName, setMerchantName] = useState("");
  const [merchantCity, setMerchantCity] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.functions.invoke("pix-settings", {
          body: { action: "get_pix" },
        });
        if (data?.settings) {
          setPixKey(String(data.settings.pix_key || ""));
          setPixKeyType((String(data.settings.pix_key_type || "cpf") as PixKeyType));
          setMerchantName(String(data.settings.merchant_name || ""));
          setMerchantCity(String(data.settings.merchant_city || ""));
          setPixSaved(Boolean(data.settings.pix_key));
        }
      } catch {
        setPixSaved(false);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!pixKey.trim() || !merchantName.trim() || !merchantCity.trim()) {
      toast.error("Preencha a chave PIX, nome e cidade.");
      return;
    }
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("pix-settings", {
        body: {
          action: "save_pix",
          pix_key: pixKey,
          pix_key_type: pixKeyType,
          merchant_name: merchantName,
          merchant_city: merchantCity,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPixSaved(true);
      toast.success("PIX configurado!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tente novamente.";
      toast.error(message);
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
            <QrCode className="h-5 w-5 text-green-600" />
            Configuração PIX
          </CardTitle>
          <CardDescription>Configure sua chave PIX para pagamentos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {pixSaved && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-700">PIX configurado!</p>
                <p className="text-sm text-green-600">Clientes podem pagar via PIX.</p>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Chave PIX *</Label>
              <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="CPF/CNPJ/email/telefone" />
            </div>
            <div className="space-y-2">
              <Label>Tipo da chave *</Label>
              <Select value={pixKeyType} onValueChange={(v) => setPixKeyType(v as PixKeyType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome do favorecido *</Label>
              <Input value={merchantName} onChange={(e) => setMerchantName(e.target.value)} placeholder="Razão social" />
            </div>
            <div className="space-y-2">
              <Label>Cidade *</Label>
              <Input value={merchantCity} onChange={(e) => setMerchantCity(e.target.value)} placeholder="Cidade" />
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PixSettingsManager;
