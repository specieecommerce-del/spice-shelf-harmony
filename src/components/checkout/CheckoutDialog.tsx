import { useState, useEffect, useRef, useCallback } from "react";
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
import { Loader2, CreditCard, QrCode, ShoppingBag, Tag, X, CheckCircle2, Copy, Check, ArrowLeft, PartyPopper } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generatePixCode, PixPaymentData } from "@/lib/pix-generator";
import { QRCodeSVG } from "qrcode.react";

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

interface PixOrderData {
  orderNsu: string;
  txId: string;
  totalAmount: number;
  pixSettings: {
    pixKey: string;
    pixKeyType: string;
    merchantName: string;
    merchantCity: string;
  };
}

const CheckoutDialog = ({ open, onOpenChange }: CheckoutDialogProps) => {
  const { items, getCartTotal, setIsCartOpen, clearCart } = useCart();
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

  // PIX state
  const [showPixPayment, setShowPixPayment] = useState(false);
  const [pixOrderData, setPixOrderData] = useState<PixOrderData | null>(null);
  const [pixCode, setPixCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [pixConfigured, setPixConfigured] = useState<boolean | null>(null);

  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2).replace(".", ",")}`;
  };

  const subtotal = getCartTotal();
  const discount = appliedCoupon?.discountAmount || 0;
  const total = Math.max(0, subtotal - discount);

  // Check if PIX is configured
  useEffect(() => {
    const checkPixConfig = async () => {
      try {
        const { data } = await supabase.functions.invoke("pix-settings", {
          body: { action: "get_pix_for_payment" },
        });
        setPixConfigured(data?.configured || false);
      } catch {
        setPixConfigured(false);
      }
    };
    if (open) {
      checkPixConfig();
    }
  }, [open]);

  // Function to check payment status
  const checkPaymentStatus = useCallback(async (orderNsu: string) => {
    try {
      setIsCheckingPayment(true);
      const { data, error } = await supabase.functions.invoke("check-payment", {
        body: { orderNsu },
      });

      if (error) {
        console.error("Error checking payment:", error);
        return false;
      }

      if (data?.success && data?.order?.status === "paid") {
        return true;
      }

      return false;
    } catch (err) {
      console.error("Payment check error:", err);
      return false;
    } finally {
      setIsCheckingPayment(false);
    }
  }, []);

  // Start polling when PIX payment screen is shown
  useEffect(() => {
    if (showPixPayment && pixOrderData && !paymentConfirmed) {
      // Start polling every 5 seconds
      pollingIntervalRef.current = setInterval(async () => {
        const isPaid = await checkPaymentStatus(pixOrderData.orderNsu);
        if (isPaid) {
          setPaymentConfirmed(true);
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          toast({
            title: "🎉 Pagamento confirmado!",
            description: "Seu pagamento foi recebido com sucesso.",
          });
        }
      }, 5000); // Check every 5 seconds

      // Cleanup on unmount or when payment is confirmed
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [showPixPayment, pixOrderData, paymentConfirmed, checkPaymentStatus, toast]);

  // Cleanup polling when dialog closes
  useEffect(() => {
    if (!open && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, [open]);

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

  const handlePixCheckout = async () => {
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
      const { data, error } = await supabase.functions.invoke("create-pix-order", {
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
          coupon: appliedCoupon ? {
            code: appliedCoupon.code,
            discountAmount: appliedCoupon.discountAmount,
          } : null,
        },
      });

      if (error || !data?.success) {
        console.error("Error creating PIX order:", error || data?.error);
        toast({
          title: "Erro ao criar pedido",
          description: data?.error || "Tente novamente mais tarde.",
          variant: "destructive",
        });
        return;
      }

      // Generate PIX code
      const pixData: PixPaymentData = {
        pixKey: data.pixSettings.pixKey,
        pixKeyType: data.pixSettings.pixKeyType,
        merchantName: data.pixSettings.merchantName,
        merchantCity: data.pixSettings.merchantCity,
        amount: data.totalAmount,
        txId: data.txId,
        description: `Pedido ${data.orderNsu.substring(0, 15)}`,
      };

      const generatedPixCode = generatePixCode(pixData);
      setPixCode(generatedPixCode);
      setPixOrderData(data);
      setShowPixPayment(true);
      
      // Save order NSU
      localStorage.setItem("lastOrderNsu", data.orderNsu);

    } catch (err) {
      console.error("PIX checkout error:", err);
      toast({
        title: "Erro inesperado",
        description: "Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Cole no seu aplicativo de banco para pagar.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Selecione e copie manualmente.",
        variant: "destructive",
      });
    }
  };

  const handlePixPaymentDone = () => {
    // Stop polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    clearCart();
    onOpenChange(false);
    setIsCartOpen(false);
    setShowPixPayment(false);
    setPixOrderData(null);
    setPixCode("");
    setPaymentConfirmed(false);
    toast({
      title: paymentConfirmed ? "Compra finalizada!" : "Obrigado!",
      description: paymentConfirmed 
        ? "Seu pedido foi confirmado com sucesso." 
        : "Assim que identificarmos o pagamento, você receberá a confirmação por email.",
    });
  };

  const handleBackToCart = () => {
    // Stop polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setShowPixPayment(false);
    setPixOrderData(null);
    setPixCode("");
    setPaymentConfirmed(false);
  };

  // PIX Payment Screen
  if (showPixPayment && pixOrderData) {
    // Payment Confirmed Screen
    if (paymentConfirmed) {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-serif text-green-700">
                <PartyPopper className="w-5 h-5" />
                Pagamento Confirmado!
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="bg-green-100 border border-green-300 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-green-800 mb-2">
                  Pagamento recebido!
                </h3>
                <p className="text-green-700">
                  Seu pedido foi confirmado com sucesso.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pedido</span>
                  <span className="font-medium">{pixOrderData.orderNsu}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor pago</span>
                  <span className="font-bold text-green-600">
                    {formatPrice(pixOrderData.totalAmount)}
                  </span>
                </div>
              </div>

              <Button
                variant="hero"
                className="w-full"
                size="lg"
                onClick={handlePixPaymentDone}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Concluir
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Você receberá os detalhes do pedido por email.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    // PIX QR Code Screen with Polling
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <QrCode className="w-5 h-5 text-green-600" />
              Pagamento PIX
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-green-800">Pedido criado com sucesso!</p>
              <p className="text-sm text-green-700">Nº {pixOrderData.orderNsu}</p>
            </div>

            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-center">Valor a pagar</h4>
              <p className="text-3xl font-bold text-center text-primary">
                {formatPrice(pixOrderData.totalAmount)}
              </p>
            </div>

            {/* QR Code Visual */}
            <div className="flex flex-col items-center space-y-3 bg-white rounded-lg p-6 border">
              <h4 className="font-medium text-sm text-muted-foreground">Escaneie o QR Code:</h4>
              <div className="p-3 bg-white rounded-lg border-2 border-primary/20">
                <QRCodeSVG
                  value={pixCode}
                  size={180}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Aponte a câmera do app do banco para o QR Code
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou copie o código</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Código PIX Copia e Cola:</h4>
              <div className="relative">
                <textarea
                  readOnly
                  value={pixCode}
                  className="w-full h-20 p-3 text-xs font-mono bg-muted rounded-lg resize-none border"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={handleCopyPixCode}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              variant="hero"
              className="w-full"
              size="lg"
              onClick={handleCopyPixCode}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Código Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Código PIX
                </>
              )}
            </Button>

            {/* Payment Status Indicator */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
              <div className="flex-shrink-0">
                {isCheckingPayment ? (
                  <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  Aguardando pagamento...
                </p>
                <p className="text-xs text-amber-600">
                  A confirmação será automática após o pagamento
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-blue-800 text-sm">Como pagar:</h4>
              <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                <li>Abra o app do seu banco</li>
                <li>Escolha a opção PIX &gt; Copia e Cola</li>
                <li>Cole o código copiado</li>
                <li>Confirme os dados e pague</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleBackToCart}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handlePixPaymentDone}
              >
                Já paguei
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              A página atualizará automaticamente quando o pagamento for confirmado.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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

          {/* Payment Methods */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Forma de Pagamento</h4>
            
            {/* PIX Button - Primary */}
            {pixConfigured && (
              <Button
                variant="hero"
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
                onClick={handlePixCheckout}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <QrCode className="w-5 h-5 mr-2" />
                    Pagar com PIX - {formatPrice(total)}
                  </>
                )}
              </Button>
            )}

            {pixConfigured === false && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <p className="text-sm text-amber-700">
                  PIX ainda não configurado pela loja. Entre em contato para outras formas de pagamento.
                </p>
              </div>
            )}

            {pixConfigured === null && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            O pagamento é processado diretamente para a conta do vendedor via PIX
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutDialog;
