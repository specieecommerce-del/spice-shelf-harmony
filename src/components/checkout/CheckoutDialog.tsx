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
import { Loader2, CreditCard, QrCode, ShoppingBag, Tag, X, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AppliedCoupon {
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  discountAmount: number;
}

const CheckoutDialog = ({ open, onOpenChange }: CheckoutDialogProps) => {
  const { items, getCartTotal, setIsCartOpen } = useCart();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2).replace(".", ",")}`;
  };

  const subtotal = getCartTotal();
  const discount = appliedCoupon?.discountAmount || 0;
  const total = Math.max(0, subtotal - discount);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({
        title: "Digite um código",
        description: "Insira o código do cupom para aplicar.",
        variant: "destructive",
      });
      return;
    }

    setIsValidatingCoupon(true);

    try {
      const { data, error } = await supabase.functions.invoke("manage-coupons", {
        body: {
          action: "validate",
          code: couponCode,
          orderTotal: subtotal,
        },
      });

      if (error) throw error;

      if (!data.valid) {
        toast({
          title: "Cupom inválido",
          description: data.error || "Este cupom não pode ser usado.",
          variant: "destructive",
        });
        return;
      }

      setAppliedCoupon(data.coupon);
      setCouponCode("");
      toast({
        title: "Cupom aplicado!",
        description: `Desconto de ${formatPrice(data.coupon.discountAmount)} aplicado.`,
      });
    } catch (err) {
      console.error("Error validating coupon:", err);
      toast({
        title: "Erro ao validar cupom",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast({
      title: "Cupom removido",
    });
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
          coupon: appliedCoupon ? {
            code: appliedCoupon.code,
            discountAmount: appliedCoupon.discountAmount,
          } : null,
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
            
            <div className="border-t pt-2 mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              
              {appliedCoupon && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {appliedCoupon.code}
                  </span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-semibold text-lg pt-1">
                <span>Total</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
            </div>
          </div>

          {/* Coupon Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Tag className="w-4 h-4" />
              Cupom de desconto
            </Label>
            
            {appliedCoupon ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div className="flex-1">
                  <span className="font-medium text-green-700">{appliedCoupon.code}</span>
                  {appliedCoupon.description && (
                    <p className="text-xs text-green-600">{appliedCoupon.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveCoupon}
                  className="text-green-600 hover:text-green-700 hover:bg-green-100"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Digite o código"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                  maxLength={20}
                />
                <Button
                  variant="outline"
                  onClick={handleApplyCoupon}
                  disabled={isValidatingCoupon}
                >
                  {isValidatingCoupon ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Aplicar"
                  )}
                </Button>
              </div>
            )}
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
              <>Ir para Pagamento - {formatPrice(total)}</>
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
