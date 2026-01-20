import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { MessageSquare, Bell, Package, Loader2, CheckCircle2, Settings, Phone, Zap, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const WhatsAppAlertsManager = () => {
  const [isTestingStock, setIsTestingStock] = useState(false);
  const [isTestingOrder, setIsTestingOrder] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Settings
  const [alertPhone, setAlertPhone] = useState("");
  const [immediateAlerts, setImmediateAlerts] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Load phone setting
      const { data: phoneData } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "whatsapp_alert_phone")
        .maybeSingle();
      
      const phoneValue = phoneData?.value as { phone?: string } | null;
      if (phoneValue?.phone) {
        setAlertPhone(phoneValue.phone);
      } else {
        setAlertPhone("5511919778073"); // Default
      }

      // Load immediate alerts setting
      const { data: immediateData } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "whatsapp_immediate_alerts")
        .maybeSingle();
      
      const immediateValue = immediateData?.value as { enabled?: boolean } | null;
      if (immediateValue !== undefined) {
        setImmediateAlerts(immediateValue?.enabled ?? true);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!alertPhone.trim()) {
      toast.error("Digite um número de telefone válido");
      return;
    }

    // Clean phone number - remove non-digits
    const cleanPhone = alertPhone.replace(/\D/g, "");
    
    if (cleanPhone.length < 10 || cleanPhone.length > 13) {
      toast.error("Número de telefone inválido. Use o formato: 5511999999999");
      return;
    }

    try {
      setIsSaving(true);

      // Save phone
      const { error: phoneError } = await supabase
        .from("store_settings")
        .upsert({
          key: "whatsapp_alert_phone",
          value: { phone: cleanPhone },
        }, { onConflict: "key" });

      if (phoneError) throw phoneError;

      // Save immediate alerts setting
      const { error: immediateError } = await supabase
        .from("store_settings")
        .upsert({
          key: "whatsapp_immediate_alerts",
          value: { enabled: immediateAlerts },
        }, { onConflict: "key" });

      if (immediateError) throw immediateError;

      setAlertPhone(cleanPhone);
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const testStockAlert = async () => {
    setIsTestingStock(true);
    try {
      const { data, error } = await supabase.functions.invoke('stock-alert-whatsapp', {
        body: {},
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Alerta enviado para ${data.products?.length || 0} produtos com estoque baixo`);
      } else if (data?.message === "No low stock alerts needed") {
        toast.info("Nenhum produto com estoque baixo encontrado");
      } else {
        toast.error(data?.error || "Erro ao enviar alerta");
      }
    } catch (error) {
      console.error("Error testing stock alert:", error);
      toast.error("Erro ao testar alerta de estoque");
    } finally {
      setIsTestingStock(false);
    }
  };

  const testOrderAlert = async () => {
    setIsTestingOrder(true);
    try {
      const testPayload = {
        order_nsu: "TESTE_" + Date.now(),
        customer_name: "Cliente Teste",
        customer_phone: "11999999999",
        total_amount: 9990, // R$ 99,90 em centavos
        payment_method: "pix",
        items: [
          { name: "Produto Teste 1", quantity: 2, price: 2990 },
          { name: "Produto Teste 2", quantity: 1, price: 4010 },
        ],
      };

      const { data, error } = await supabase.functions.invoke('order-alert-whatsapp', {
        body: testPayload,
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Alerta de pedido de teste enviado com sucesso!");
      } else {
        toast.error(data?.error || "Erro ao enviar alerta");
      }
    } catch (error) {
      console.error("Error testing order alert:", error);
      toast.error("Erro ao testar alerta de pedido");
    } finally {
      setIsTestingOrder(false);
    }
  };

  const formatPhone = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, "");
    
    // Format as: 55 11 99999-9999
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9, 13)}`;
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
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Alertas WhatsApp
        </h2>
        <p className="text-muted-foreground mt-1">
          Gerencie e teste os alertas automáticos via WhatsApp
        </p>
      </div>

      {/* Configuration Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações
          </CardTitle>
          <CardDescription>
            Configure o número de destino e o comportamento dos alertas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Número para receber alertas
            </Label>
            <Input
              id="phone"
              type="text"
              placeholder="55 11 99999-9999"
              value={formatPhone(alertPhone)}
              onChange={(e) => setAlertPhone(e.target.value.replace(/\D/g, ""))}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Formato: código do país + DDD + número (ex: 5511999999999)
            </p>
          </div>

          <div className="flex items-center justify-between max-w-md">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Alertas imediatos de estoque
              </Label>
              <p className="text-xs text-muted-foreground">
                Receber alerta assim que o estoque ficar abaixo do mínimo
              </p>
            </div>
            <Switch
              checked={immediateAlerts}
              onCheckedChange={setImmediateAlerts}
            />
          </div>

          <Button onClick={saveSettings} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              Alerta de Estoque Baixo
            </CardTitle>
            <CardDescription>
              Verifica produtos com estoque abaixo do limite e envia alerta via WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Cron Job: A cada hora (minuto 0)</span>
              </div>
              {immediateAlerts && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span>Alerta imediato: Ativado</span>
                </div>
              )}
            </div>
            <Button 
              onClick={testStockAlert} 
              disabled={isTestingStock}
              className="w-full"
            >
              {isTestingStock ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Testar Alerta Agora
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-500" />
              Alerta de Novo Pedido
            </CardTitle>
            <CardDescription>
              Envia notificação via WhatsApp sempre que um novo pedido é criado 
              (PIX ou cartão de crédito).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Automático: A cada novo pedido</span>
            </div>
            <Button 
              onClick={testOrderAlert} 
              disabled={isTestingOrder}
              variant="outline"
              className="w-full"
            >
              {isTestingOrder ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Enviar Pedido de Teste
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Como funciona o alerta imediato?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span>
              Quando o estoque de um produto é atualizado e fica igual ou abaixo do limite mínimo, uma notificação é registrada automaticamente.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span>
              O sistema envia imediatamente um alerta via WhatsApp para o número configurado.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">3.</span>
              Além disso, uma verificação geral é feita a cada hora para garantir que nenhum produto foi esquecido.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppAlertsManager;
