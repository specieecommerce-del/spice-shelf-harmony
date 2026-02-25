import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Zap, CreditCard, Wallet, Receipt, Building2, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GatewayStatus {
  name: string;
  icon: React.ReactNode;
  status: "active" | "inactive" | "coming_soon";
  description: string;
  webhookUrl?: string;
}

const GatewayStatusManager = () => {
  const [loading, setLoading] = useState(true);
  const [gateways, setGateways] = useState<GatewayStatus[]>([]);
  const [projectUrl, setProjectUrl] = useState("");

  const checkGatewayStatus = async () => {
    setLoading(true);
    const url = import.meta.env.VITE_SUPABASE_URL || "";
    setProjectUrl(url);
    try {
      const { data: infinitePayRow } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "card_gateway_infinitepay")
        .maybeSingle();
      const { data: pagSeguroRow } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "card_gateway_pagseguro")
        .maybeSingle();
      const { data: pixRow } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "pix_settings")
        .maybeSingle();
      const { data: boletoRow } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "boleto_settings")
        .maybeSingle();
      const { data: boletoLegacyRow } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "boleto_registered_settings")
        .maybeSingle();

      const infinitePay = (infinitePayRow?.value ?? null) as { enabled?: boolean } | null;
      const pagSeguro = (pagSeguroRow?.value ?? null) as { enabled?: boolean; gateway_type?: string } | null;
      const pix = (pixRow?.value ?? null) as { pix_key?: string } | null;
      const boletoVal = (boletoRow?.value ?? null) as Record<string, unknown> | null;
      const boletoLegacy = (boletoLegacyRow?.value ?? null) as Record<string, unknown> | null;

      const boletoEnabled = (() => {
        if (!boletoVal) return false;
        const enabled = Boolean(boletoVal["enabled"]);
        const mode = String(boletoVal["mode"] || "manual");
        if (!enabled) return false;
        if (mode === "manual") {
          const manual = (boletoVal["manual"] ?? {}) as Record<string, unknown>;
          return Boolean(manual["bank_code"] && manual["beneficiary_name"] && manual["beneficiary_document"]);
        }
        const registered = (boletoVal["registered"] ?? {}) as Record<string, unknown>;
        const bank = (registered["bank"] ?? {}) as Record<string, unknown>;
        return Boolean((bank["code"] ?? "").toString().trim());
      })();
      const boletoLegacyEnabled = (() => {
        if (!boletoLegacy) return false;
        const enabled = Boolean(boletoLegacy["enabled"] ?? true);
        const mode = String(boletoLegacy["mode"] || "");
        if (mode !== "registered") return false;
        const bank = (boletoLegacy["bank"] ?? {}) as Record<string, unknown>;
        return enabled && Boolean(String(bank["code"] || "").trim());
      })();

      const gatewayList: GatewayStatus[] = [
        {
          name: "InfinitePay",
          icon: <CreditCard className="h-5 w-5" />,
          status: infinitePay?.enabled ? "active" : "inactive",
          description: "Cartão de crédito/débito e PIX via InfinitePay",
          webhookUrl: `${url}/functions/v1/infinitepay-webhook`,
        },
        {
          name: "PagSeguro",
          icon: <CreditCard className="h-5 w-5" />,
          status: pagSeguro?.enabled || pagSeguro?.gateway_type === "pagseguro" ? "active" : "inactive",
          description: "Cartão de crédito/débito via PagSeguro",
          webhookUrl: `${url}/functions/v1/pagseguro-webhook`,
        },
        {
          name: "PIX Manual",
          icon: <Wallet className="h-5 w-5" />,
          status: pix?.pix_key ? "active" : "inactive",
          description: "PIX com QR Code gerado pelo sistema",
          webhookUrl: undefined,
        },
          {
            name: "Boleto",
            icon: <Receipt className="h-5 w-5" />,
            status: boletoEnabled || boletoLegacyEnabled ? "active" : "inactive",
            description: "Boleto bancário (configurar gateway)",
            webhookUrl: undefined,
          },
        {
          name: "Nubank PJ",
          icon: <Building2 className="h-5 w-5" />,
          status: "coming_soon",
          description: "Integração direta com Nubank - Em breve quando API oficial estiver disponível",
          webhookUrl: undefined,
        },
      ];

      setGateways(gatewayList);
    } catch (error) {
      console.error("Erro ao verificar gateways:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkGatewayStatus();
  }, []);

  const getStatusBadge = (status: GatewayStatus["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ativo
          </Badge>
        );
      case "inactive":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <XCircle className="h-3 w-3 mr-1" />
            Inativo
          </Badge>
        );
      case "coming_soon":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Em Breve
          </Badge>
        );
    }
  };

  const [toggling, setToggling] = useState<string | null>(null);
  const toggleGateway = async (name: string, toActive: boolean) => {
    try {
      setToggling(name);
      if (name === "InfinitePay") {
        const { data } = await supabase.functions.invoke("card-gateway-settings", {
          body: { action: "get_settings", gateway: "infinitepay" },
        });
        const s = (data?.settings ?? {}) as Record<string, unknown>;
        await supabase.functions.invoke("card-gateway-settings", {
          body: {
            action: "save_settings",
            gateway: "infinitepay",
            enabled: toActive,
            payment_link: String(s["payment_link"] || ""),
            whatsapp_number: String(s["whatsapp_number"] || ""),
            instructions: String(s["instructions"] || ""),
          },
        });
      } else if (name === "PagSeguro") {
        const { data } = await supabase.functions.invoke("card-gateway-settings", {
          body: { action: "get_settings", gateway: "pagseguro" },
        });
        const s = (data?.settings ?? {}) as Record<string, unknown>;
        await supabase.functions.invoke("card-gateway-settings", {
          body: {
            action: "save_settings",
            gateway: "pagseguro",
            enabled: toActive,
            payment_link: String(s["payment_link"] || ""),
            whatsapp_number: String(s["whatsapp_number"] || ""),
            instructions: String(s["instructions"] || ""),
          },
        });
      } else if (name === "PIX Manual") {
        await supabase.functions.invoke("pix-settings", {
          body: { action: "set_enabled", enabled: toActive },
        });
      } else if (name === "Boleto") {
        await supabase.functions.invoke("boleto-settings", {
          body: { action: "set_enabled", enabled: toActive },
        });
      }
      await checkGatewayStatus();
      setToggling(null);
    } catch {
      setToggling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeGateways = gateways.filter(g => g.status === "active").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gateway de Pagamento</h2>
        <p className="text-muted-foreground">
          Configure e monitore seus métodos de pagamento
        </p>
      </div>

      {/* Status Geral */}
      <Card className={activeGateways > 0 
        ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20"
        : "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20"
      }>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${activeGateways > 0 ? "bg-green-500/20" : "bg-amber-500/20"}`}>
              <Zap className={`h-6 w-6 ${activeGateways > 0 ? "text-green-600" : "text-amber-600"}`} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {activeGateways > 0 
                  ? "Sistema de Pagamentos Ativo" 
                  : "Nenhum Gateway Configurado"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {activeGateways > 0 
                  ? `${activeGateways} gateway(s) configurado(s) e recebendo webhooks`
                  : "Configure pelo menos um gateway para receber pagamentos"}
              </p>
            </div>
            {activeGateways > 0 && (
              <Badge className="ml-auto bg-green-500 text-white">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Online
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fluxo Automático */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fluxo de Confirmação Automática</CardTitle>
          <CardDescription>Como funciona o sistema de webhooks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center justify-center py-4">
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-lg">
              <span className="font-medium">1. Cliente paga</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-lg border border-blue-500/30">
              <span className="font-medium text-blue-700">2. Gateway confirma</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex items-center gap-2 bg-purple-500/10 px-4 py-2 rounded-lg border border-purple-500/30">
              <span className="font-medium text-purple-700">3. Webhook recebe</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-lg border border-green-500/30">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-700">4. Pedido PAGO</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Gateways */}
      <div className="grid gap-4">
        {gateways.map((gateway) => (
          <Card key={gateway.name} className={gateway.status === "coming_soon" ? "opacity-60" : ""}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${
                    gateway.status === "active" 
                      ? "bg-green-500/10" 
                      : gateway.status === "coming_soon"
                        ? "bg-amber-500/10"
                        : "bg-muted"
                  }`}>
                    {gateway.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{gateway.name}</h3>
                      {getStatusBadge(gateway.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {gateway.description}
                    </p>
                    {gateway.webhookUrl && gateway.status === "active" && (
                      <div className="mt-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {gateway.webhookUrl}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {gateway.status !== "coming_soon" && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const gatewayKey = gateway.name === "PIX Manual" ? "pix-manual"
                          : gateway.name === "Boleto" ? "boleto"
                          : gateway.name === "InfinitePay" ? "infinitepay"
                          : gateway.name === "PagSeguro" ? "pagseguro"
                          : "";
                        const event = new CustomEvent('admin-section-change', { 
                          detail: { section: 'payments', gateway: gatewayKey } 
                        });
                        window.dispatchEvent(event);
                      }}
                    >
                      Configurar
                    </Button>
                  )}
                  {gateway.status !== "coming_soon" && (
                    <Button
                      variant={gateway.status === "active" ? "destructive" : "default"}
                      size="sm"
                      disabled={toggling === gateway.name}
                      onClick={() => toggleGateway(gateway.name, gateway.status !== "active")}
                    >
                      {toggling === gateway.name ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : gateway.status === "active" ? (
                        "Desativar"
                      ) : (
                        "Ativar"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Aviso Nubank */}
      <Alert className="border-amber-500/30 bg-amber-500/5">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-700">Nubank PJ - Em Desenvolvimento</AlertTitle>
        <AlertDescription className="text-amber-600">
          Integração direta com Nubank disponível quando houver API oficial. 
          O sistema está preparado para ativar automaticamente quando a API for liberada.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default GatewayStatusManager;
