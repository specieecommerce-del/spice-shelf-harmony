import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, QrCode, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CheckoutDialog = ({ open, onOpenChange }: CheckoutDialogProps) => {
  const { items, getCartTotal, clearCart, setIsCartOpen } = useCart();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2).replace(".", ",")}`;
  };

  const handleCheckout = async () => {
    if (!customerInfo.name || !customerInfo.email) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha nome e email.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/pagamento-confirmado`;

      const { data, error } = await supabase.functions.invoke("create-payment-link", {
        body: {
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            category: item.category,
          })),
          customer: {
            name: customerInfo.name,
            email: customerInfo.email,
            phone: customerInfo.phone,
          },
          redirectUrl,
        },
      });

      if (error) {
        console.error("Error creating payment link:", error);
        toast({
          title: "Erro ao criar pagamento",
          description: "Tente novamente mais tarde.",
          variant: "destructive",
        });
        return;
      }

      if (data?.paymentUrl) {
        // Save order NSU to localStorage for status check
        localStorage.setItem("lastOrderNsu", data.orderNsu);
        
        // Close dialogs and cart
        onOpenChange(false);
        setIsCartOpen(false);
        
        // Redirect to InfinitePay checkout
        window.location.href = data.paymentUrl;
      } else {
        toast({
          title: "Erro ao processar pagamento",
          description: "Não foi possível gerar o link de pagamento.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast({
        title: "Erro inesperado",
        description: "Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <ShoppingBag className="w-5 h-5" />
            Finalizar Compra
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Summary */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              Resumo do Pedido
            </h4>
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.quantity}x {item.name}
                </span>
                <span className="font-medium">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatPrice(getCartTotal())}</span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                value={customerInfo.name}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, name: e.target.value })
                }
                placeholder="Seu nome"
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={customerInfo.email}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, email: e.target.value })
                }
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <Input
                id="phone"
                value={customerInfo.phone}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, phone: e.target.value })
                }
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          {/* Payment Methods Info */}
          <div className="bg-spice-gold/10 rounded-lg p-3 space-y-2">
            <h4 className="font-medium text-sm">Formas de Pagamento</h4>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CreditCard className="w-4 h-4" />
                <span>Cartão até 12x</span>
              </div>
              <div className="flex items-center gap-1">
                <QrCode className="w-4 h-4" />
                <span>PIX</span>
              </div>
            </div>
          </div>

          {/* Checkout Button */}
          <Button
            variant="hero"
            className="w-full"
            size="lg"
            onClick={handleCheckout}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>Ir para Pagamento</>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Você será redirecionado para a página segura de pagamento InfinitePay
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutDialog;
