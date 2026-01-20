import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Truck, CheckCircle, Clock, Search, AlertCircle, MapPin, ExternalLink } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OrderStatus {
  id: string;
  order_nsu: string;
  status: string;
  created_at: string;
  total_amount: number;
  tracking_code: string | null;
  shipping_carrier: string | null;
  shipped_at: string | null;
  customer_name: string | null;
}

const OrderTracking = () => {
  const [searchCode, setSearchCode] = useState("");
  const [searchType, setSearchType] = useState<"order" | "tracking">("order");
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchCode.trim()) {
      toast.error(searchType === "order" ? "Digite o código do pedido" : "Digite o código de rastreio");
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      let data, error;
      
      if (searchType === "order") {
        const result = await supabase.rpc('check_order_status', {
          p_order_nsu: searchCode.trim()
        });
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase.rpc('check_order_by_tracking', {
          p_tracking_code: searchCode.trim()
        });
        data = result.data;
        error = result.error;
      }

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

  const getCarrierTrackingUrl = (carrier: string | null, trackingCode: string | null) => {
    if (!carrier || !trackingCode) return null;
    
    const carrierUrls: Record<string, string> = {
      correios: `https://rastreamento.correios.com.br/app/index.php?objetos=${trackingCode}`,
      jadlog: `https://www.jadlog.com.br/siteInstitucional/tracking.jad?cte=${trackingCode}`,
      sedex: `https://rastreamento.correios.com.br/app/index.php?objetos=${trackingCode}`,
      pac: `https://rastreamento.correios.com.br/app/index.php?objetos=${trackingCode}`,
      loggi: `https://www.loggi.com/rastreador/${trackingCode}`,
      azul_cargo: `https://www.azulcargoexpress.com.br/rastreamento?code=${trackingCode}`,
    };
    
    return carrierUrls[carrier.toLowerCase()] || null;
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
              Digite o código do seu pedido ou código de rastreio para acompanhar a entrega
            </p>
            
            {/* Search Tabs */}
            <div className="max-w-xl mx-auto">
              <Tabs value={searchType} onValueChange={(v) => setSearchType(v as "order" | "tracking")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="order" className="flex items-center gap-2">
                    <Package size={16} />
                    Nº do Pedido
                  </TabsTrigger>
                  <TabsTrigger value="tracking" className="flex items-center gap-2">
                    <MapPin size={16} />
                    Código de Rastreio
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="order" className="mt-0">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                      <Input
                        type="text"
                        placeholder="Digite o código do pedido (ex: SP-123456)"
                        className="pl-12 h-14 text-lg"
                        value={searchCode}
                        onChange={(e) => setSearchCode(e.target.value)}
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
                </TabsContent>
                
                <TabsContent value="tracking" className="mt-0">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                      <Input
                        type="text"
                        placeholder="Digite o código de rastreio (ex: BR123456789BR)"
                        className="pl-12 h-14 text-lg"
                        value={searchCode}
                        onChange={(e) => setSearchCode(e.target.value)}
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
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>

        {/* Result */}
        {searched && (
          <section className="py-12">
            <div className="container-species max-w-3xl">
              {order ? (
                <div className="bg-card rounded-xl border p-8">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div>
                      <p className="text-sm text-muted-foreground">Pedido</p>
                      <p className="font-semibold text-lg">{order.order_nsu}</p>
                      {order.customer_name && (
                        <p className="text-sm text-muted-foreground mt-1">{order.customer_name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-semibold text-primary">{getStatusLabel(order.status)}</p>
                    </div>
                  </div>

                  {/* Tracking Info */}
                  {order.tracking_code && (
                    <div className="bg-primary/5 rounded-lg p-4 mb-8 border border-primary/10">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <MapPin size={14} />
                            Código de Rastreio
                          </p>
                          <p className="font-mono font-semibold text-lg">{order.tracking_code}</p>
                          {order.shipping_carrier && (
                            <p className="text-sm text-muted-foreground capitalize">
                              Transportadora: {order.shipping_carrier}
                            </p>
                          )}
                        </div>
                        {getCarrierTrackingUrl(order.shipping_carrier, order.tracking_code) && (
                          <Button variant="outline" size="sm" asChild>
                            <a 
                              href={getCarrierTrackingUrl(order.shipping_carrier, order.tracking_code)!} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              <ExternalLink size={14} />
                              Rastrear na Transportadora
                            </a>
                          </Button>
                        )}
                      </div>
                      {order.shipped_at && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Enviado em: {new Date(order.shipped_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      )}
                    </div>
                  )}

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
                    {searchType === "order" 
                      ? "Verifique se o código do pedido está correto e tente novamente."
                      : "Verifique se o código de rastreio está correto e tente novamente."
                    }
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
