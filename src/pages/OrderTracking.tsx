import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Package, Truck, CheckCircle, Clock, Search, AlertCircle } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OrderStatus {
  id: string;
  order_nsu: string;
  status: string;
  created_at: string;
  total_amount: number;
}

const OrderTracking = () => {
  const [trackingCode, setTrackingCode] = useState("");
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!trackingCode.trim()) {
      toast.error("Digite o código do pedido");
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase.rpc('check_order_status', {
        p_order_nsu: trackingCode.trim()
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setOrder(data[0] as OrderStatus);
      } else {
        setOrder(null);
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("Erro ao buscar pedido");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusSteps = (status: string) => {
    const steps = [
      { id: "pending", label: "Pedido Recebido", icon: Package },
      { id: "paid", label: "Pagamento Confirmado", icon: CheckCircle },
      { id: "processing", label: "Em Preparação", icon: Clock },
      { id: "shipped", label: "Enviado", icon: Truck },
      { id: "delivered", label: "Entregue", icon: CheckCircle },
    ];

    const statusOrder = ["pending", "paid", "processing", "shipped", "delivered"];
    const currentIndex = statusOrder.indexOf(status);

    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      current: index === currentIndex,
    }));
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Aguardando Pagamento",
      paid: "Pagamento Confirmado",
      processing: "Em Preparação",
      shipped: "Enviado",
      delivered: "Entregue",
      cancelled: "Cancelado",
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-32 pb-16">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-spice-cream to-background py-16">
          <div className="container-species text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Truck className="text-primary" size={32} />
            </div>
            <h1 className="font-serif text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Rastrear Pedido
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              Digite o código do seu pedido para acompanhar o status da entrega
            </p>
            
            {/* Search */}
            <div className="max-w-xl mx-auto flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  type="text"
                  placeholder="Digite o código do pedido (ex: SP-123456)"
                  className="pl-12 h-14 text-lg"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button 
                size="lg" 
                className="h-14 px-8"
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? "Buscando..." : "Rastrear"}
              </Button>
            </div>
          </div>
        </section>

        {/* Result */}
        {searched && (
          <section className="py-12">
            <div className="container-species max-w-3xl">
              {order ? (
                <div className="bg-card rounded-xl border p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <p className="text-sm text-muted-foreground">Pedido</p>
                      <p className="font-semibold text-lg">{order.order_nsu}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-semibold text-primary">{getStatusLabel(order.status)}</p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="relative">
                    {getStatusSteps(order.status).map((step, index) => (
                      <div key={step.id} className="flex items-start gap-4 pb-8 last:pb-0">
                        <div className="relative">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              step.completed
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <step.icon size={20} />
                          </div>
                          {index < getStatusSteps(order.status).length - 1 && (
                            <div
                              className={`absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-8 ${
                                step.completed ? "bg-primary" : "bg-muted"
                              }`}
                            />
                          )}
                        </div>
                        <div className="pt-2">
                          <p
                            className={`font-medium ${
                              step.completed ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {step.label}
                          </p>
                          {step.current && (
                            <p className="text-sm text-primary">Status atual</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Details */}
                  <div className="mt-8 pt-8 border-t">
                    <h3 className="font-semibold mb-4">Detalhes do Pedido</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Data do pedido</p>
                        <p className="font-medium">
                          {new Date(order.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valor total</p>
                        <p className="font-medium">
                          R$ {(order.total_amount / 100).toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-card rounded-xl border p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="text-destructive" size={32} />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Pedido não encontrado</h3>
                  <p className="text-muted-foreground">
                    Verifique se o código do pedido está correto e tente novamente.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Help Section */}
        <section className="py-12">
          <div className="container-species max-w-3xl">
            <div className="bg-spice-cream rounded-xl p-8 text-center">
              <h3 className="font-serif text-xl font-bold mb-2">Precisa de ajuda?</h3>
              <p className="text-muted-foreground mb-4">
                Entre em contato conosco pelo WhatsApp para obter suporte
              </p>
              <Button variant="forest" asChild>
                <a href="https://wa.me/5511919778073" target="_blank" rel="noopener noreferrer">
                  Falar no WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default OrderTracking;
