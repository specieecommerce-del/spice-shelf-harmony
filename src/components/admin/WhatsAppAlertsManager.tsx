import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageSquare, Bell, Package, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const WhatsAppAlertsManager = () => {
  const [isTestingStock, setIsTestingStock] = useState(false);
  const [isTestingOrder, setIsTestingOrder] = useState(false);

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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              Alerta de Estoque Baixo
            </CardTitle>
            <CardDescription>
              Verifica produtos com estoque abaixo do limite e envia alerta via WhatsApp.
              Executado automaticamente a cada hora.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Cron Job: A cada hora (minuto 0)</span>
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

      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
          <CardDescription>
            Número de destino dos alertas: <strong>+55 11 91977-8073</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Para alterar o número de destino ou as credenciais da Z-API, 
            entre em contato com o suporte técnico.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppAlertsManager;
