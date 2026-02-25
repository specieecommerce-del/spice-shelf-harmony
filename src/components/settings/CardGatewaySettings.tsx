import { useState, useEffect } from "react";
import { CreditCard, CheckCircle2, AlertCircle, Loader2, ExternalLink, MessageCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type GatewayType = 'external_link' | 'whatsapp' | 'manual' | 'infinitepay' | 'pagseguro';

interface CardGatewaySettingsData {
  enabled: boolean;
  gateway_type: GatewayType;
  payment_link: string;
  whatsapp_number: string;
  instructions: string;
}

const CardGatewaySettings = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const gatewayKey = (searchParams.get("gateway") || "pagseguro") as GatewayType;
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [settings, setSettings] = useState<CardGatewaySettingsData>({
    enabled: false,
    gateway_type: 'manual',
    payment_link: '',
    whatsapp_number: '',
    instructions: 'Entre em contato conosco para finalizar o pagamento com cartão.',
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("card-gateway-settings", {
          body: { action: "get_settings", gateway: gatewayKey },
        });

        if (error) {
          console.error("Error loading card gateway settings:", error);
        } else if (data?.settings) {
          setSettings({
            enabled: data.settings.enabled ?? false,
            gateway_type: data.settings.gateway_type ?? 'manual',
            payment_link: data.settings.payment_link ?? '',
            whatsapp_number: data.settings.whatsapp_number ?? '',
            instructions: data.settings.instructions ?? 'Entre em contato conosco para finalizar o pagamento com cartão.',
          });
        }
      } catch (err) {
        console.error("Failed to load card gateway settings:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke("card-gateway-settings", {
        body: {
          action: "save_settings",
          gateway: gatewayKey,
          ...settings,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Configurações salvas!",
        description: "O pagamento com cartão foi configurado com sucesso.",
      });
    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-spice-forest" />
          {gatewayKey === "infinitepay" ? "InfinitePay" : gatewayKey === "pagseguro" ? "PagSeguro" : "Pagamento com Cartão"}
        </CardTitle>
        <CardDescription>
          Configure como seus clientes podem pagar com cartão de crédito ou débito.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {settings.enabled ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            )}
            <div>
              <p className={`font-medium ${settings.enabled ? 'text-green-700' : 'text-amber-700'}`}>
                {settings.enabled ? 'Pagamento com cartão ativado' : 'Pagamento com cartão desativado'}
              </p>
              <p className="text-sm text-muted-foreground">
                {settings.enabled 
                  ? 'Clientes podem pagar com cartão' 
                  : 'Ative para aceitar pagamentos com cartão'}
              </p>
            </div>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
          />
        </div>

        {settings.enabled && (
          <>
            {/* Gateway Type Selection */}
            <div className="space-y-3">
              <Label>Tipo de Pagamento</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, gateway_type: 'external_link' }))}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    settings.gateway_type === 'external_link'
                      ? 'border-spice-forest bg-spice-forest/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink className={`h-5 w-5 ${settings.gateway_type === 'external_link' ? 'text-spice-forest' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-medium">Link de Pagamento</p>
                      <p className="text-xs text-muted-foreground">PagSeguro, Mercado Pago, etc.</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, gateway_type: 'whatsapp' }))}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    settings.gateway_type === 'whatsapp'
                      ? 'border-spice-forest bg-spice-forest/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MessageCircle className={`h-5 w-5 ${settings.gateway_type === 'whatsapp' ? 'text-spice-forest' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-medium">WhatsApp</p>
                      <p className="text-xs text-muted-foreground">Cliente entra em contato</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, gateway_type: 'infinitepay' }))}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    settings.gateway_type === 'infinitepay'
                      ? 'border-spice-forest bg-spice-forest/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Wallet className={`h-5 w-5 ${settings.gateway_type === 'infinitepay' ? 'text-spice-forest' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-medium">InfinitePay</p>
                      <p className="text-xs text-muted-foreground">Integração automática</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, gateway_type: 'pagseguro' }))}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    settings.gateway_type === 'pagseguro'
                      ? 'border-spice-forest bg-spice-forest/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className={`h-5 w-5 ${settings.gateway_type === 'pagseguro' ? 'text-spice-forest' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-medium">PagSeguro</p>
                      <p className="text-xs text-muted-foreground">Integração automática</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, gateway_type: 'manual' }))}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    settings.gateway_type === 'manual'
                      ? 'border-spice-forest bg-spice-forest/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className={`h-5 w-5 ${settings.gateway_type === 'manual' ? 'text-spice-forest' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-medium">Manual</p>
                      <p className="text-xs text-muted-foreground">Exibe instruções personalizadas</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Gateway-specific settings */}
            {settings.gateway_type === 'external_link' && (
              <div className="space-y-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="space-y-2">
                  <Label htmlFor="payment-link">Link de Pagamento</Label>
                  <Input
                    id="payment-link"
                    type="url"
                    placeholder="https://pagseguro.com.br/seu-link ou https://mpago.la/seu-link"
                    value={settings.payment_link}
                    onChange={(e) => setSettings(prev => ({ ...prev, payment_link: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Cole o link de pagamento do seu gateway (PagSeguro, Mercado Pago, PicPay, etc.)
                  </p>
                </div>
              </div>
            )}

            {settings.gateway_type === 'whatsapp' && (
              <div className="space-y-4 p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-number">Número do WhatsApp</Label>
                  <Input
                    id="whatsapp-number"
                    type="tel"
                    placeholder="11999999999 (apenas números)"
                    value={settings.whatsapp_number}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      whatsapp_number: e.target.value.replace(/\D/g, '') 
                    }))}
                    maxLength={13}
                  />
                  <p className="text-xs text-muted-foreground">
                    O cliente será redirecionado para o WhatsApp para combinar o pagamento
                  </p>
                </div>
              </div>
            )}

            {settings.gateway_type === 'infinitepay' && (
              <div className="space-y-4 p-4 rounded-lg bg-purple-50 border border-purple-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-800">Integração InfinitePay</p>
                    <p className="text-sm text-purple-700 mt-1">
                      Configure o Handle da InfinitePay nos secrets do servidor (INFINITEPAY_HANDLE) 
                      para ativar pagamentos automáticos via InfinitePay.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {settings.gateway_type === 'pagseguro' && (
              <div className="space-y-4 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Integração PagSeguro</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      As credenciais do PagSeguro (PAGSEGURO_EMAIL e PAGSEGURO_TOKEN) já estão configuradas.
                      Os clientes serão redirecionados para a página de pagamento do PagSeguro.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {settings.gateway_type === 'manual' && (
              <div className="space-y-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="space-y-2">
                  <Label htmlFor="instructions">Instruções para o Cliente</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Instruções de como o cliente pode pagar com cartão..."
                    value={settings.instructions}
                    onChange={(e) => setSettings(prev => ({ ...prev, instructions: e.target.value }))}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Essas instruções serão exibidas para o cliente no checkout
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full bg-spice-forest hover:bg-spice-forest/90"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar configurações'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CardGatewaySettings;
