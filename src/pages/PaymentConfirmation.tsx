import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Home, Receipt } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

interface OrderStatus {
  id: string;
  orderNsu: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: string;
  installments: number;
  receiptUrl: string;
  createdAt: string;
}

const PaymentConfirmation = () => {
  const [searchParams] = useSearchParams();
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderNsu = searchParams.get("order_nsu") || localStorage.getItem("lastOrderNsu");
  const receiptUrl = searchParams.get("receipt_url");

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!orderNsu) {
        setError("Pedido não encontrado");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("check-payment", {
          body: { orderNsu },
        });

        if (error) {
          console.error("Error checking payment:", error);
          setError("Erro ao verificar status do pagamento");
          return;
        }

        if (data?.order) {
          setOrderStatus(data.order);
          // Clear stored order NSU
          localStorage.removeItem("lastOrderNsu");
        } else {
          setError("Pedido não encontrado");
        }
      } catch (err) {
        console.error("Error:", err);
        setError("Erro ao verificar pagamento");
      } finally {
        setIsLoading(false);
      }
    };

    checkPaymentStatus();
  }, [orderNsu]);

  const formatPrice = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "credit_card":
        return "Cartão de Crédito";
      case "pix":
        return "PIX";
      default:
        return method || "Não identificado";
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          {isLoading ? (
            <div className="space-y-4">
              <Loader2 className="w-16 h-16 animate-spin mx-auto text-primary" />
              <h2 className="text-xl font-serif font-semibold">
                Verificando pagamento...
              </h2>
              <p className="text-muted-foreground">
                Por favor, aguarde enquanto confirmamos seu pagamento.
              </p>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <XCircle className="w-16 h-16 mx-auto text-destructive" />
              <h2 className="text-xl font-serif font-semibold">{error}</h2>
              <Button variant="forest" asChild>
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" />
                  Voltar para Home
                </Link>
              </Button>
            </div>
          ) : orderStatus?.status === "paid" ? (
            <div className="space-y-6">
              <div className="bg-spice-forest/10 rounded-full w-24 h-24 flex items-center justify-center mx-auto">
                <CheckCircle className="w-16 h-16 text-spice-forest" />
              </div>
              
              <div>
                <h2 className="text-2xl font-serif font-semibold text-spice-forest mb-2">
                  Pagamento Confirmado!
                </h2>
                <p className="text-muted-foreground">
                  Obrigado pela sua compra. Seu pedido foi processado com sucesso.
                </p>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pedido</span>
                  <span className="font-medium text-sm">
                    #{orderStatus.orderNsu.slice(-8)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Forma de Pagamento</span>
                  <span className="font-medium">
                    {getPaymentMethodLabel(orderStatus.paymentMethod)}
                    {orderStatus.installments > 1 &&
                      ` (${orderStatus.installments}x)`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Total</span>
                  <span className="font-semibold text-primary">
                    {formatPrice(orderStatus.paidAmount || orderStatus.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {(receiptUrl || orderStatus.receiptUrl) && (
                  <Button variant="outline" className="flex-1" asChild>
                    <a
                      href={receiptUrl || orderStatus.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Receipt className="w-4 h-4 mr-2" />
                      Ver Comprovante
                    </a>
                  </Button>
                )}
                <Button variant="forest" className="flex-1" asChild>
                  <Link to="/">
                    <Home className="w-4 h-4 mr-2" />
                    Continuar Comprando
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-500/10 rounded-full w-24 h-24 flex items-center justify-center mx-auto">
                <Loader2 className="w-12 h-12 text-yellow-600 animate-spin" />
              </div>
              <h2 className="text-xl font-serif font-semibold">
                Aguardando Pagamento
              </h2>
              <p className="text-muted-foreground">
                Seu pagamento ainda está sendo processado. Tente atualizar a página em alguns instantes.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Atualizar Status
                </Button>
                <Button variant="forest" asChild>
                  <Link to="/">Voltar para Home</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentConfirmation;
