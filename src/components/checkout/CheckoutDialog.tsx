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
import { Loader2, CreditCard, QrCode, ShoppingBag, Tag, X, CheckCircle2, Copy, Check, ArrowLeft, PartyPopper, FileText, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generatePixCode, PixPaymentData } from "@/lib/pix-generator";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface BoletoOrderData {
  orderNsu: string;
  totalAmount: number;
  dueDate: string;
  boletoData: {
    bankCode: string;
    bankName: string;
    agency: string;
    account: string;
    accountType: string;
    beneficiaryName: string;
    beneficiaryDocument: string;
    instructions: string;
  };
}

type PaymentMethod = "pix" | "credit_card" | "boleto" | null;

const CheckoutDialog = ({ open, onOpenChange }: CheckoutDialogProps) => {
  const { items, getCartTotal, setIsCartOpen, clearCart } = useCart();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    cpfCnpj: "",
    phone: "",
  });

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  // Payment method state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(null);

  // PIX state
  const [showPixPayment, setShowPixPayment] = useState(false);
  const [pixOrderData, setPixOrderData] = useState<PixOrderData | null>(null);
  const [pixCode, setPixCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [pixConfigured, setPixConfigured] = useState<boolean | null>(null);
  const [pixOffline, setPixOffline] = useState<boolean>(false);

  // Boleto state
  const [showBoletoPayment, setShowBoletoPayment] = useState(false);
  const [boletoOrderData, setBoletoOrderData] = useState<BoletoOrderData | null>(null);
  const [boletoConfigured, setBoletoConfigured] = useState<boolean | null>(null);
  const [boletoMode, setBoletoMode] = useState<string | null>(null);

  // Card state
  const [cardConfigured, setCardConfigured] = useState<boolean | null>(null);
  const [cardGatewayConfig, setCardGatewayConfig] = useState<{
    gateway_type?: string;
    payment_link?: string;
    whatsapp_number?: string;
    instructions?: string;
  } | null>(null);

  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2).replace(".", ",")}`;
  };

  const subtotal = getCartTotal();
  const discount = appliedCoupon?.discountAmount || 0;
  const total = Math.max(0, subtotal - discount);

  // Check payment methods configuration
  useEffect(() => {
    const checkPaymentConfigs = async () => {
      // Check PIX
      try {
        const { data: pixData } = await supabase.functions.invoke("pix-settings", {
          body: { action: "get_pix_for_payment" },
        });
        setPixConfigured(pixData?.configured || false);
        setPixOffline(false);
        if (!pixData?.configured) {
          const { data: overrideRow } = await supabase
            .from("store_settings")
            .select("value")
            .eq("key", "pix_settings_override")
            .maybeSingle();
          const override = (overrideRow?.value ?? null) as Record<string, unknown> | null;
          const disabled = override && override["enabled"] === false;
          if (!disabled) {
            const { data: pixRow } = await supabase
              .from("store_settings")
              .select("value")
              .eq("key", "pix_settings")
              .maybeSingle();
            const v = (pixRow?.value ?? null) as Record<string, unknown> | null;
            if (v && typeof v["pix_key"] === "string" && String(v["pix_key"]).trim() !== "") {
              setPixConfigured(true);
              setPixOffline(true);
            }
          }
        }
      } catch {
        try {
          const { data: overrideRow } = await supabase
            .from("store_settings")
            .select("value")
            .eq("key", "pix_settings_override")
            .maybeSingle();
          const override = (overrideRow?.value ?? null) as Record<string, unknown> | null;
          const disabled = override && override["enabled"] === false;
          if (disabled) {
            setPixConfigured(false);
            setPixOffline(false);
          } else {
            const { data: pixRow } = await supabase
              .from("store_settings")
              .select("value")
              .eq("key", "pix_settings")
              .maybeSingle();
            const v = (pixRow?.value ?? null) as Record<string, unknown> | null;
            if (v && typeof v["pix_key"] === "string" && String(v["pix_key"]).trim() !== "") {
              setPixConfigured(true);
              setPixOffline(true);
            } else {
              setPixConfigured(false);
              setPixOffline(false);
            }
          }
        } catch {
          setPixConfigured(false);
          setPixOffline(false);
        }
      }

      // Check Boleto with direct DB fallback
      try {
        const { data: boletoData } = await supabase.functions.invoke("boleto-settings", {
          body: { action: "get_boleto_for_payment" },
        });
        setBoletoConfigured(boletoData?.configured || false);
        setBoletoMode(typeof boletoData?.mode === "string" ? String(boletoData.mode).toLowerCase() : null);
        if (!boletoData?.configured) {
          const { data: row } = await supabase
            .from("store_settings")
            .select("value")
            .eq("key", "boleto_settings")
            .maybeSingle();
          const v = (row?.value ?? null) as Record<string, unknown> | null;
          if (v) {
            const enabled = Boolean(v["enabled"]);
            const mode = String(v["mode"] || "manual");
            const manual = (v["manual"] ?? {}) as Record<string, unknown>;
            const registered = (v["registered"] ?? {}) as Record<string, unknown>;
            const configured =
              enabled &&
              (mode === "manual"
                ? Boolean(manual["bank_code"] && manual["beneficiary_name"] && manual["beneficiary_document"])
                : Boolean(((registered["bank"] ?? {}) as Record<string, unknown>)["code"]));
            setBoletoConfigured(configured);
            setBoletoMode(mode.toLowerCase());
          }
        }
      } catch {
        try {
          const { data: row } = await supabase
            .from("store_settings")
            .select("value")
            .eq("key", "boleto_settings")
            .maybeSingle();
          const v = (row?.value ?? null) as Record<string, unknown> | null;
          if (v) {
            const enabled = Boolean(v["enabled"]);
            const mode = String(v["mode"] || "manual");
            const manual = (v["manual"] ?? {}) as Record<string, unknown>;
            const registered = (v["registered"] ?? {}) as Record<string, unknown>;
            const configured =
              enabled &&
              (mode === "manual"
                ? Boolean(manual["bank_code"] && manual["beneficiary_name"] && manual["beneficiary_document"])
                : Boolean(((registered["bank"] ?? {}) as Record<string, unknown>)["code"]));
            setBoletoConfigured(configured);
            setBoletoMode(mode.toLowerCase());
          } else {
            setBoletoConfigured(false);
            setBoletoMode(null);
          }
        } catch {
          setBoletoConfigured(false);
          setBoletoMode(null);
        }
      }

      // Check Card gateway settings (manual fallback if none configured)
      try {
        const gateways = ["infinitepay", "pagseguro"];
        let configured = false;
        let selectedConfig: { gateway_type?: string; payment_link?: string; whatsapp_number?: string; instructions?: string } | null = null;
        for (const g of gateways) {
          const { data } = await supabase.functions.invoke("card-gateway-settings", {
            body: { action: "get_settings", gateway: g },
          });
          const s = (data?.settings ?? null) as { enabled?: boolean; payment_link?: string; whatsapp_number?: string; instructions?: string } | null;
          if (s?.enabled) {
            configured = true;
            const hasLink = !!s.payment_link && s.payment_link.trim() !== "";
            const hasWhats = !!s.whatsapp_number && s.whatsapp_number.trim() !== "";
            selectedConfig = {
              gateway_type: hasWhats ? "whatsapp" : (hasLink ? "external_link" : "manual"),
              payment_link: s.payment_link,
              whatsapp_number: s.whatsapp_number,
              instructions: s.instructions,
            };
            break;
          }
        }
        if (!configured) {
          selectedConfig = { gateway_type: "manual", instructions: "Entre em contato" };
        }
        setCardConfigured(true);
        setCardGatewayConfig(selectedConfig);
      } catch (cardErr) {
        console.error("Card config check failed:", cardErr);
        setCardConfigured(true);
        setCardGatewayConfig({ gateway_type: "manual", instructions: "Entre em contato" });
      }
    };
    if (open) {
      checkPaymentConfigs();
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

  // Function to send order confirmation emails
  const sendOrderEmails = useCallback(async () => {
    if (!pixOrderData) return;
    
    try {
      console.log("Sending order confirmation emails...");
      const { error } = await supabase.functions.invoke("send-order-emails", {
        body: {
          orderNsu: pixOrderData.orderNsu,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          totalAmount: pixOrderData.totalAmount,
          items: items.map((item) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      });

      if (error) {
        console.error("Error sending emails:", error);
      } else {
        console.log("Order confirmation emails sent successfully");
      }
    } catch (err) {
      console.error("Failed to send order emails:", err);
    }
  }, [pixOrderData, customerInfo, items]);

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
          
          // Send confirmation emails to customer and admin
          sendOrderEmails();
          
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
  }, [showPixPayment, pixOrderData, paymentConfirmed, checkPaymentStatus, toast, sendOrderEmails]);

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
    setShowBoletoPayment(false);
    setPixOrderData(null);
    setBoletoOrderData(null);
    setPixCode("");
    setPaymentConfirmed(false);
    setSelectedPaymentMethod(null);
  };

  // Credit Card checkout - handles different gateway types
  const handleCardCheckout = async () => {
    if (!customerInfo.name || !customerInfo.email) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha nome e email.",
        variant: "destructive",
      });
      return;
    }

    const gatewayType = cardGatewayConfig?.gateway_type;

    // Handle WhatsApp gateway
    if (gatewayType === 'whatsapp') {
      const whatsappNumber = cardGatewayConfig?.whatsapp_number;
      if (whatsappNumber) {
        const message = encodeURIComponent(
          `Olá! Gostaria de finalizar uma compra com cartão.\n\nNome: ${customerInfo.name}\nEmail: ${customerInfo.email}\nValor: R$ ${total.toFixed(2).replace(".", ",")}\n\nItens:\n${items.map(i => `- ${i.quantity}x ${i.name}`).join('\n')}`
        );
        window.open(`https://wa.me/55${whatsappNumber}?text=${message}`, '_blank');
        return;
      }
    }

    // Handle external link gateway
    if (gatewayType === 'external_link') {
      const paymentLink = cardGatewayConfig?.payment_link;
      if (paymentLink) {
        window.open(paymentLink, '_blank');
        return;
      }
    }

    // Handle manual gateway - show instructions
    if (gatewayType === 'manual') {
      const instructions = cardGatewayConfig?.instructions || 'Entre em contato conosco para finalizar o pagamento.';
      toast({
        title: "Pagamento com Cartão",
        description: instructions,
      });
      return;
    }

    // Handle InfinitePay gateway (existing flow)
    if (gatewayType === 'infinitepay') {
      setIsLoading(true);

      try {
        const redirectUrl = `${window.location.origin}/payment-confirmation`;

        const { data, error } = await supabase.functions.invoke("create-payment-link", {
          body: {
            items: items.map((item) => ({
              id: Number(item.id) || 1,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              image: item.image || "",
              category: item.category || "",
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
          const anyErr = error as any;
          const body = anyErr?.context?.body;
          const gatewayMessage =
            typeof body?.gatewayMessage === "string"
              ? body.gatewayMessage
              : typeof body?.error === "string"
                ? body.error
                : typeof body === "string"
                  ? body
                  : null;

          console.error("Error creating payment link:", { error, body });
          toast({
            title: "Erro ao criar link de pagamento",
            description:
              gatewayMessage ||
              "Não foi possível gerar o link de pagamento. Verifique a configuração do cartão e tente novamente.",
            variant: "destructive",
          });
          return;
        }

        if (!data?.success) {
          console.error("Payment link function returned failure:", data);
          toast({
            title: "Erro ao criar link de pagamento",
            description:
              (data as any)?.gatewayMessage ||
              (data as any)?.error ||
              "Tente novamente mais tarde.",
            variant: "destructive",
          });
          return;
        }

        // Redirect to payment page
        window.location.href = data.paymentUrl;

      } catch (err) {
        const anyErr = err as any;
        const body = anyErr?.context?.body;
        const gatewayMessage =
          typeof body?.gatewayMessage === "string"
            ? body.gatewayMessage
            : typeof body?.error === "string"
              ? body.error
              : null;

        console.error("Card checkout error:", { err, body });
        toast({
          title: "Erro inesperado",
          description: gatewayMessage || "Por favor, tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    // Handle PagSeguro gateway
    if (gatewayType === 'pagseguro') {
      setIsLoading(true);

      try {
        const redirectUrl = `${window.location.origin}/payment-confirmation`;

        const { data, error } = await supabase.functions.invoke("create-pagseguro-payment", {
          body: {
            items: items.map((item) => ({
              id: Number(item.id) || 1,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              image: item.image || "",
              category: item.category || "",
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
          console.error("Error creating PagSeguro payment:", error);
          toast({
            title: "Erro ao criar pagamento",
            description: "Não foi possível gerar o link de pagamento PagSeguro.",
            variant: "destructive",
          });
          return;
        }

        if (!data?.success) {
          console.error("PagSeguro function returned failure:", data);
          toast({
            title: "Erro ao criar pagamento",
            description: data?.error || "Tente novamente mais tarde.",
            variant: "destructive",
          });
          return;
        }

        // Redirect to PagSeguro payment page
        window.location.href = data.paymentUrl;

      } catch (err) {
        console.error("PagSeguro checkout error:", err);
        toast({
          title: "Erro inesperado",
          description: "Por favor, tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Boleto checkout
  const handleBoletoCheckout = async () => {
    if (!customerInfo.name || !customerInfo.email) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha nome e email.",
        variant: "destructive",
      });
      return;
    }

    if (!customerInfo.cpfCnpj.trim()) {
      toast({
        title: "CPF/CNPJ obrigatório",
        description: "Para gerar boleto, informe seu CPF ou CNPJ.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
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
          cpfCnpj: customerInfo.cpfCnpj,
          phone: customerInfo.phone,
        },
        coupon: appliedCoupon ? {
          code: appliedCoupon.code,
          discountAmount: appliedCoupon.discountAmount,
        } : null,
      };

      const useAsaas = boletoMode === "asaas";
      const { data, error } = await supabase.functions.invoke(useAsaas ? "create-asaas-boleto" : "create-boleto-order", {
        body: payload,
      });

      if (error || !data?.success) {
        console.error("Error creating boleto order:", error || data?.error);
        toast({
          title: "Erro ao criar pedido",
          description: data?.error || "Tente novamente mais tarde.",
          variant: "destructive",
        });
        return;
      }

      const normalizedBoletoData = useAsaas && data?.boleto
        ? {
            ...data,
            boletoData: {
              bankCode: "ASAAS",
              bankName: "Asaas",
              agency: "-",
              account: "-",
              accountType: "boleto",
              beneficiaryName: customerInfo.name,
              beneficiaryDocument: customerInfo.cpfCnpj,
              instructions: data?.boleto?.linhaDigitavel
                ? `Linha digitável: ${data.boleto.linhaDigitavel}`
                : "Abra o boleto no link para visualizar os dados completos.",
            },
          }
        : data;

      setBoletoOrderData(normalizedBoletoData);
      setShowBoletoPayment(true);
      localStorage.setItem("lastOrderNsu", data.orderNsu);

    } catch (err) {
      console.error("Boleto checkout error:", err);
      toast({
        title: "Erro inesperado",
        description: "Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBoletoPaymentDone = () => {
    clearCart();
    onOpenChange(false);
    setIsCartOpen(false);
    setShowBoletoPayment(false);
    setBoletoOrderData(null);
    toast({
      title: "Pedido criado!",
      description: "Efetue o depósito/transferência conforme as instruções. Assim que identificarmos o pagamento, você receberá a confirmação por email.",
    });
  };

  const copyBoletoData = async () => {
    if (!boletoOrderData) return;
    
    const text = `Banco: ${boletoOrderData.boletoData.bankName} (${boletoOrderData.boletoData.bankCode})
Agência: ${boletoOrderData.boletoData.agency}
Conta: ${boletoOrderData.boletoData.account} (${boletoOrderData.boletoData.accountType})
Favorecido: ${boletoOrderData.boletoData.beneficiaryName}
CPF/CNPJ: ${boletoOrderData.boletoData.beneficiaryDocument}
Valor: R$ ${boletoOrderData.totalAmount.toFixed(2).replace(".", ",")}
Pedido: ${boletoOrderData.orderNsu}`;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Dados copiados!" });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  // Boleto Payment Screen
  if (showBoletoPayment && boletoOrderData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <FileText className="w-5 h-5 text-blue-600" />
              Pagamento via Depósito/Transferência
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="font-medium text-blue-800">Pedido criado com sucesso!</p>
              <p className="text-sm text-blue-700">Nº {boletoOrderData.orderNsu}</p>
            </div>

            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-center">Valor a pagar</h4>
              <p className="text-3xl font-bold text-center text-primary">
                {formatPrice(boletoOrderData.totalAmount)}
              </p>
              <p className="text-xs text-center text-muted-foreground">
                Vencimento: {format(new Date(boletoOrderData.dueDate), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>

            {/* Bank Data */}
            <div className="bg-white rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Dados Bancários</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Banco:</span>
                  <p className="font-medium">{boletoOrderData.boletoData.bankName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Código:</span>
                  <p className="font-medium">{boletoOrderData.boletoData.bankCode}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Agência:</span>
                  <p className="font-medium">{boletoOrderData.boletoData.agency}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Conta:</span>
                  <p className="font-medium">{boletoOrderData.boletoData.account}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Tipo:</span>
                  <p className="font-medium capitalize">{boletoOrderData.boletoData.accountType}</p>
                </div>
              </div>

              <div className="pt-2 border-t">
                <span className="text-muted-foreground text-sm">Favorecido:</span>
                <p className="font-medium">{boletoOrderData.boletoData.beneficiaryName}</p>
                <p className="text-sm text-muted-foreground">{boletoOrderData.boletoData.beneficiaryDocument}</p>
              </div>

              {boletoOrderData.boletoData.instructions && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground text-sm">Instruções:</span>
                  <p className="text-sm">{boletoOrderData.boletoData.instructions}</p>
                </div>
              )}
            </div>

            <Button
              variant="hero"
              className="w-full"
              size="lg"
              onClick={copyBoletoData}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Dados Copiados!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Dados Bancários
                </>
              )}
            </Button>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800 font-medium">Importante:</p>
              <p className="text-xs text-amber-700">
                Após efetuar o depósito/transferência, envie o comprovante por email ou WhatsApp para agilizar a liberação do pedido.
              </p>
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
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleBoletoPaymentDone}
              >
                Já paguei
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
              <Label htmlFor="cpfCnpj">CPF/CNPJ *</Label>
              <Input
                id="cpfCnpj"
                value={customerInfo.cpfCnpj}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, cpfCnpj: e.target.value })
                }
                placeholder="000.000.000-00"
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
            
            {/* Loading state */}
            {(pixConfigured === null || boletoConfigured === null) && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Payment method buttons */}
            {pixConfigured !== null && boletoConfigured !== null && (
              <div className="space-y-2">
                {/* PIX */}
                {pixConfigured && (
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3 px-4 border-2 hover:border-green-500 hover:bg-green-50"
                    onClick={handlePixCheckout}
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <QrCode className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">PIX</p>
                <p className="text-xs text-muted-foreground">
                  {pixOffline ? "Modo offline" : "Aprovação imediata"}
                </p>
                      </div>
                      {isLoading && selectedPaymentMethod === "pix" && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                    </div>
                  </Button>
                )}

                {/* Credit Card */}
                {cardConfigured && (
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3 px-4 border-2 hover:border-blue-500 hover:bg-blue-50"
                    onClick={handleCardCheckout}
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">Cartão de Crédito</p>
                        <p className="text-xs text-muted-foreground">
                          {cardGatewayConfig?.gateway_type === 'whatsapp' 
                            ? 'Fale conosco via WhatsApp' 
                            : cardGatewayConfig?.gateway_type === 'external_link'
                              ? 'Link de pagamento externo'
                              : cardGatewayConfig?.gateway_type === 'manual'
                                ? 'Entre em contato'
                                : 'Parcele em até 12x'}
                        </p>
                      </div>
                      {isLoading && selectedPaymentMethod === "credit_card" && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                    </div>
                  </Button>
                )}

                {/* Boleto */}
                {boletoConfigured && (
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3 px-4 border-2 hover:border-orange-500 hover:bg-orange-50"
                    onClick={handleBoletoCheckout}
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">Boleto</p>
                        <p className="text-xs text-muted-foreground">Aprovação em até 24h</p>
                      </div>
                      {isLoading && selectedPaymentMethod === "boleto" && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                    </div>
                  </Button>
                )}

                {/* No payment methods configured */}
                {!pixConfigured && !boletoConfigured && !cardConfigured && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                    <p className="text-sm text-amber-700">
                      Nenhuma forma de pagamento configurada. Entre em contato com a loja.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Valor total: <span className="font-semibold text-primary">{formatPrice(total)}</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutDialog;
