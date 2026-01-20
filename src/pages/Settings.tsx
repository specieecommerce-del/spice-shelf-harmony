import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, CreditCard, ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle, Building2, Wallet, Loader2, Tag, ShieldAlert, QrCode, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCPFCNPJ, validateCPFCNPJ } from "@/lib/cpf-cnpj";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CouponsManager from "@/components/settings/CouponsManager";
import { detectPixKeyType, generatePixCode, PixPaymentData } from "@/lib/pix-generator";
import { QRCodeSVG } from "qrcode.react";

// Lista dos bancos mais comuns no Brasil
const COMMON_BANKS: Record<string, string> = {
  "001": "Banco do Brasil",
  "033": "Santander",
  "104": "Caixa Econômica Federal",
  "237": "Bradesco",
  "341": "Itaú Unibanco",
  "260": "Nubank",
  "077": "Inter",
  "212": "Banco Original",
  "290": "PagBank",
  "380": "PicPay",
  "336": "C6 Bank",
  "756": "Sicoob",
  "748": "Sicredi",
  "422": "Safra",
  "070": "BRB",
  "655": "Neon",
  "323": "Mercado Pago",
  "197": "Stone",
  "403": "Cora",
  "746": "Modal",
  "208": "BTG Pactual",
  "121": "Agibank",
  "041": "Banrisul",
  "004": "BNB",
  "047": "Banese",
  "085": "Cooperativa Central Ailos",
  "136": "Unicred",
  "389": "Mercantil do Brasil",
  "633": "Rendimento",
  "707": "Daycoval",
  "739": "Cetelem",
  "269": "HSBC",
  "637": "Sofisa",
};

const PIX_KEY_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "phone", label: "Telefone" },
  { value: "email", label: "Email" },
  { value: "random", label: "Chave Aleatória" },
];

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showHandle, setShowHandle] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  
  // Payment settings - Note: The actual handle is stored server-side in INFINITEPAY_HANDLE secret
  // This state is only for UI input, not for persistent storage
  const [infinitePayHandle, setInfinitePayHandle] = useState("");
  
  // PIX settings
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("cpf");
  const [merchantName, setMerchantName] = useState("");
  const [merchantCity, setMerchantCity] = useState("");
  const [isSavingPix, setIsSavingPix] = useState(false);
  const [pixSaved, setPixSaved] = useState(false);
  
  // Bank account settings
  const [bankName, setBankName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountType, setAccountType] = useState("corrente");
  const [agency, setAgency] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [bankSaved, setBankSaved] = useState(false);
  const [cpfCnpjValidation, setCpfCnpjValidation] = useState<{ valid: boolean; type: 'cpf' | 'cnpj' | null; message: string } | null>(null);

  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      if (!user) {
        setIsLoading(false);
        navigate("/auth");
        return;
      }

try {
        // Check admin status
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
          
          // If admin, load saved settings
          if (data) {
            // Load bank account settings
            const { data: settingsData } = await supabase
              .from("store_settings")
              .select("value")
              .eq("key", "bank_account")
              .maybeSingle();
            
            if (settingsData?.value) {
              const bankSettings = settingsData.value as {
                bank_code?: string;
                bank_name?: string;
                agency?: string;
                account_number?: string;
                account_type?: string;
                holder_name?: string;
                holder_document?: string;
              };
              setBankCode(bankSettings.bank_code || "");
              setBankName(bankSettings.bank_name || "");
              setAgency(bankSettings.agency || "");
              setAccountNumber(bankSettings.account_number || "");
              setAccountType(bankSettings.account_type || "corrente");
              setAccountHolder(bankSettings.holder_name || "");
              setCpfCnpj(formatCPFCNPJ(bankSettings.holder_document || ""));
              setBankSaved(true);
            }

            // Load PIX settings
            const { data: pixData } = await supabase.functions.invoke("pix-settings", {
              body: { action: "get_pix" },
            });
            
            if (pixData?.settings) {
              setPixKey(pixData.settings.pix_key || "");
              setPixKeyType(pixData.settings.pix_key_type || "cpf");
              setMerchantName(pixData.settings.merchant_name || "");
              setMerchantCity(pixData.settings.merchant_city || "");
              setPixSaved(true);
            }
          }
        }
      } catch (err) {
        console.error("Error:", err);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAndLoadData();
    setConnectionStatus('connected');
  }, [user, navigate]);

  const handleSavePixSettings = async () => {
    if (!pixKey.trim() || !merchantName.trim() || !merchantCity.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a chave PIX, nome e cidade.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingPix(true);

    try {
      const { data, error } = await supabase.functions.invoke("pix-settings", {
        body: {
          action: "save_pix",
          pix_key: pixKey,
          pix_key_type: pixKeyType,
          merchant_name: merchantName,
          merchant_city: merchantCity,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPixSaved(true);
      toast({
        title: "PIX configurado!",
        description: "Os clientes agora podem pagar via PIX.",
      });
    } catch (err) {
      toast({
        title: "Erro ao salvar PIX",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPix(false);
    }
  };

  const handleSavePaymentSettings = async () => {
    // Note: The InfinitePay handle is configured as a server-side secret (INFINITEPAY_HANDLE)
    // To update the handle, the user should contact support or update the secret in Lovable Cloud
    toast({
      title: "Configuração do InfinitePay",
      description: "O Handle da InfinitePay é configurado de forma segura no servidor. Entre em contato com o suporte para alterações.",
    });
  };

  const handleSaveBankAccount = async () => {
    if (!bankName.trim() || !bankCode.trim() || !agency.trim() || !accountNumber.trim() || !cpfCnpj.trim() || !accountHolder.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos da conta bancária.",
        variant: "destructive",
      });
      return;
    }

    const validation = validateCPFCNPJ(cpfCnpj);
    if (!validation.valid) {
      toast({
        title: "CPF/CNPJ inválido",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para vincular sua conta bancária.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingBank(true);

    try {
      const { data, error } = await supabase.functions.invoke("save-bank-account", {
        body: {
          bank_code: bankCode,
          bank_name: bankName,
          agency: agency,
          account_number: accountNumber,
          account_type: accountType,
          holder_name: accountHolder,
          holder_document: cpfCnpj,
        },
      });

      if (error) {
        throw new Error(error.message || "Erro ao salvar conta bancária");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setBankSaved(true);
      toast({
        title: "Conta bancária salva!",
        description: data?.message || "Dados da conta bancária salvos com sucesso.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao salvar conta bancária";
      toast({
        title: "Erro ao vincular conta",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleDisconnect = () => {
    // Note: To disconnect InfinitePay, the user should contact support
    // The handle is stored as a server-side secret for security
    toast({
      title: "Desvinculação do InfinitePay",
      description: "Para desvincular sua conta InfinitePay, entre em contato com o suporte.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-spice-warm-white">
        <Header />
        <main className="pt-32 pb-16">
          <div className="container-species max-w-4xl flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-spice-forest" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-spice-warm-white">
        <Header />
        <main className="pt-32 pb-16">
          <div className="container-species max-w-4xl">
            <Button 
              variant="ghost" 
              className="mb-6"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para a loja
            </Button>

            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="h-6 w-6" />
                  Acesso Negado
                </CardTitle>
                <CardDescription>
                  Esta página é restrita apenas para administradores da loja.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Você não tem permissão para acessar as configurações de cupons, conta bancária e pagamentos.
                  Se você é um cliente, pode continuar navegando e fazendo suas compras normalmente.
                </p>
                <Button 
                  className="mt-4 bg-spice-forest hover:bg-spice-forest/90"
                  onClick={() => navigate("/")}
                >
                  Ir para a loja
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-spice-warm-white">
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="container-species max-w-4xl">
          {/* Back button */}
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a loja
          </Button>

          <div className="flex items-center gap-3 mb-8">
            <SettingsIcon className="h-8 w-8 text-spice-forest" />
            <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          </div>

          <Tabs defaultValue="pix" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto">
              <TabsTrigger value="pix" className="flex items-center gap-2 py-3">
                <QrCode className="h-4 w-4" />
                PIX
              </TabsTrigger>
              <TabsTrigger value="coupons" className="flex items-center gap-2 py-3">
                <Tag className="h-4 w-4" />
                Cupons
              </TabsTrigger>
              <TabsTrigger value="bank" className="flex items-center gap-2 py-3">
                <Building2 className="h-4 w-4" />
                Conta
              </TabsTrigger>
              <TabsTrigger value="payment" className="flex items-center gap-2 py-3">
                <CreditCard className="h-4 w-4" />
                InfinitePay
              </TabsTrigger>
              <TabsTrigger value="store" className="flex items-center gap-2 py-3">
                <SettingsIcon className="h-4 w-4" />
                Loja
              </TabsTrigger>
            </TabsList>

            {/* PIX Tab */}
            <TabsContent value="pix" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-green-600" />
                    Configurar Chave PIX
                  </CardTitle>
                  <CardDescription>
                    Configure sua chave PIX para receber pagamentos diretamente na sua conta.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {pixSaved && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-700">PIX configurado!</p>
                        <p className="text-sm text-green-600">Os clientes podem pagar via PIX.</p>
                      </div>
                    </div>
                  )}

                  {/* QR Code de Vínculo Bancário */}
                  {pixSaved && pixKey && merchantName && merchantCity && (
                    <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
                      <CardHeader className="text-center pb-2">
                        <CardTitle className="flex items-center justify-center gap-2 text-lg">
                          <QrCode className="h-5 w-5 text-green-600" />
                          QR Code do seu PIX
                        </CardTitle>
                        <CardDescription>
                          Compartilhe este QR Code para receber pagamentos
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center space-y-4">
                        <div className="p-4 bg-white rounded-xl border-2 border-green-100 shadow-lg">
                          <QRCodeSVG
                            id="admin-pix-qrcode"
                            value={generatePixCode({
                              pixKey: pixKey,
                              pixKeyType: pixKeyType as PixPaymentData['pixKeyType'],
                              merchantName: merchantName,
                              merchantCity: merchantCity,
                            })}
                            size={200}
                            level="H"
                            includeMargin={false}
                            bgColor="#ffffff"
                            fgColor="#000000"
                          />
                        </div>
                        <div className="text-center space-y-1">
                          <p className="font-medium text-foreground">{merchantName}</p>
                          <p className="text-sm text-muted-foreground">{merchantCity}</p>
                          <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                            {pixKey}
                          </p>
                        </div>
                        <div className="flex gap-2 w-full max-w-xs">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              const svg = document.getElementById('admin-pix-qrcode');
                              if (svg) {
                                const svgData = new XMLSerializer().serializeToString(svg);
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                const img = new Image();
                                img.onload = () => {
                                  canvas.width = 300;
                                  canvas.height = 300;
                                  ctx?.fillRect(0, 0, 300, 300);
                                  if (ctx) ctx.fillStyle = '#ffffff';
                                  ctx?.fillRect(0, 0, 300, 300);
                                  ctx?.drawImage(img, 50, 50, 200, 200);
                                  const pngFile = canvas.toDataURL('image/png');
                                  const downloadLink = document.createElement('a');
                                  downloadLink.download = `pix-${merchantName.replace(/\s+/g, '-').toLowerCase()}.png`;
                                  downloadLink.href = pngFile;
                                  downloadLink.click();
                                };
                                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                              }
                              toast({
                                title: "Download iniciado!",
                                description: "O QR Code foi salvo como imagem.",
                              });
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Baixar
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={async () => {
                              const pixCodeStr = generatePixCode({
                                pixKey: pixKey,
                                pixKeyType: pixKeyType as PixPaymentData['pixKeyType'],
                                merchantName: merchantName,
                                merchantCity: merchantCity,
                              });
                              try {
                                if (navigator.share) {
                                  await navigator.share({
                                    title: `PIX - ${merchantName}`,
                                    text: `Pague via PIX para ${merchantName}:\n\n${pixCodeStr}`,
                                  });
                                } else {
                                  await navigator.clipboard.writeText(pixCodeStr);
                                  toast({
                                    title: "Código copiado!",
                                    description: "Cole o código PIX onde desejar.",
                                  });
                                }
                              } catch {
                                await navigator.clipboard.writeText(pixCodeStr);
                                toast({
                                  title: "Código copiado!",
                                  description: "Cole o código PIX onde desejar.",
                                });
                              }
                            }}
                          >
                            <Share2 className="h-4 w-4 mr-2" />
                            Compartilhar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="pix-key">Chave PIX *</Label>
                      <Input
                        id="pix-key"
                        placeholder="CPF, CNPJ, Email, Telefone ou Chave Aleatória"
                        value={pixKey}
                        onChange={(e) => {
                          setPixKey(e.target.value);
                          const detected = detectPixKeyType(e.target.value);
                          setPixKeyType(detected);
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pix-key-type">Tipo da Chave</Label>
                      <select
                        id="pix-key-type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={pixKeyType}
                        onChange={(e) => setPixKeyType(e.target.value)}
                      >
                        {PIX_KEY_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="merchant-name">Nome do Recebedor *</Label>
                      <Input
                        id="merchant-name"
                        placeholder="Nome ou razão social"
                        value={merchantName}
                        onChange={(e) => setMerchantName(e.target.value)}
                        maxLength={25}
                      />
                      <p className="text-xs text-muted-foreground">Máximo 25 caracteres</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="merchant-city">Cidade *</Label>
                      <Input
                        id="merchant-city"
                        placeholder="Ex: São Paulo"
                        value={merchantCity}
                        onChange={(e) => setMerchantCity(e.target.value)}
                        maxLength={15}
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleSavePixSettings} 
                    disabled={isSavingPix}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isSavingPix ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <QrCode className="mr-2 h-4 w-4" />
                        Salvar Configurações PIX
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Coupons Tab */}
            <TabsContent value="coupons">
              <CouponsManager />
            </TabsContent>

            {/* Bank Account Tab */}
            <TabsContent value="bank" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-spice-forest" />
                    Conta Bancária para Recebimentos
                  </CardTitle>
                  <CardDescription>
                    Configure sua conta bancária para receber o dinheiro das vendas via PIX ou transferência.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Wallet className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800">Como funciona o recebimento?</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Configure os dados da sua conta bancária para receber os pagamentos das vendas. 
                          Você pode receber via PIX (configurado na aba PIX) ou transferência bancária direta.
                          Funciona com qualquer banco brasileiro.
                        </p>
                      </div>
                    </div>
                  </div>

                  {bankSaved && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-700">Conta bancária vinculada</p>
                        <p className="text-sm text-green-600">
                          Seus dados bancários foram salvos com sucesso.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* QR Code de Autenticação Bancária */}
                  {bankSaved && bankName && accountNumber && agency && accountHolder && (
                    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                      <CardHeader className="text-center pb-2">
                        <CardTitle className="flex items-center justify-center gap-2 text-lg">
                          <Building2 className="h-5 w-5 text-blue-600" />
                          QR Code de Vínculo Bancário
                        </CardTitle>
                        <CardDescription>
                          Use este QR Code para autenticar e vincular sua conta bancária
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center space-y-4">
                        <div className="p-4 bg-white rounded-xl border-2 border-blue-100 shadow-lg">
                          <QRCodeSVG
                            id="bank-link-qrcode"
                            value={JSON.stringify({
                              type: "BANK_LINK_AUTH",
                              bank: {
                                code: bankCode.padStart(3, '0'),
                                name: bankName,
                                agency: agency,
                                account: accountNumber,
                                type: accountType === 'corrente' ? 'CC' : 'CP',
                              },
                              holder: {
                                name: accountHolder,
                                document: cpfCnpj.replace(/\D/g, ''),
                              },
                              timestamp: new Date().toISOString(),
                              site: window.location.origin,
                            })}
                            size={180}
                            level="H"
                            includeMargin={false}
                            bgColor="#ffffff"
                            fgColor="#1e40af"
                          />
                        </div>
                        <div className="text-center space-y-2 w-full max-w-sm">
                          <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                            <p className="font-semibold text-blue-800">{bankName}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                              <div>
                                <span className="text-blue-500">Agência:</span> {agency}
                              </div>
                              <div>
                                <span className="text-blue-500">Conta:</span> {accountNumber}
                              </div>
                            </div>
                            <p className="text-xs text-blue-600">{accountHolder}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Escaneie este código para verificar os dados da conta
                          </p>
                        </div>
                        <div className="flex gap-2 w-full max-w-xs">
                          <Button
                            variant="outline"
                            className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              const svg = document.getElementById('bank-link-qrcode');
                              if (svg) {
                                const svgData = new XMLSerializer().serializeToString(svg);
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                const img = new Image();
                                img.onload = () => {
                                  canvas.width = 300;
                                  canvas.height = 300;
                                  if (ctx) {
                                    ctx.fillStyle = '#ffffff';
                                    ctx.fillRect(0, 0, 300, 300);
                                    ctx.drawImage(img, 50, 50, 200, 200);
                                  }
                                  const pngFile = canvas.toDataURL('image/png');
                                  const downloadLink = document.createElement('a');
                                  downloadLink.download = `vinculo-bancario-${bankName.replace(/\s+/g, '-').toLowerCase()}.png`;
                                  downloadLink.href = pngFile;
                                  downloadLink.click();
                                };
                                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                              }
                              toast({
                                title: "Download iniciado!",
                                description: "O QR Code de autenticação foi salvo.",
                              });
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Baixar QR
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={async () => {
                              const bankData = `Banco: ${bankName}\nAgência: ${agency}\nConta: ${accountNumber}\nTitular: ${accountHolder}\nCPF/CNPJ: ${cpfCnpj}`;
                              try {
                                if (navigator.share) {
                                  await navigator.share({
                                    title: `Dados Bancários - ${bankName}`,
                                    text: bankData,
                                  });
                                } else {
                                  await navigator.clipboard.writeText(bankData);
                                  toast({
                                    title: "Dados copiados!",
                                    description: "Os dados bancários foram copiados.",
                                  });
                                }
                              } catch {
                                await navigator.clipboard.writeText(bankData);
                                toast({
                                  title: "Dados copiados!",
                                  description: "Os dados bancários foram copiados.",
                                });
                              }
                            }}
                          >
                            <Share2 className="h-4 w-4 mr-2" />
                            Compartilhar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="bank-code">Código do Banco</Label>
                      <Input
                        id="bank-code"
                        placeholder="Ex: 001, 341, 260"
                        value={bankCode}
                        onChange={(e) => {
                          const code = e.target.value.replace(/\D/g, '');
                          setBankCode(code);
                          // Auto-preencher nome do banco se código conhecido
                          const normalizedCode = code.padStart(3, '0');
                          if (COMMON_BANKS[normalizedCode]) {
                            setBankName(COMMON_BANKS[normalizedCode]);
                          }
                        }}
                        maxLength={4}
                      />
                      {bankCode && COMMON_BANKS[bankCode.padStart(3, '0')] && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Banco reconhecido
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bank-name">Nome do Banco</Label>
                      <Input
                        id="bank-name"
                        placeholder="Ex: Banco do Brasil, Itaú, Nubank"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="account-type">Tipo de Conta</Label>
                      <select
                        id="account-type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={accountType}
                        onChange={(e) => setAccountType(e.target.value)}
                      >
                        <option value="corrente">Conta Corrente</option>
                        <option value="poupanca">Conta Poupança</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="agency">Agência</Label>
                      <Input
                        id="agency"
                        placeholder="0000"
                        value={agency}
                        onChange={(e) => setAgency(e.target.value.replace(/\D/g, ''))}
                        maxLength={5}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="account-number">Número da Conta (com dígito)</Label>
                      <Input
                        id="account-number"
                        placeholder="00000-0"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        maxLength={15}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-holder">Nome do Titular</Label>
                    <Input
                      id="account-holder"
                      placeholder="Nome completo conforme conta bancária"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf-cnpj">CPF ou CNPJ do Titular</Label>
                    <Input
                      id="cpf-cnpj"
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      value={cpfCnpj}
                      onChange={(e) => {
                        const formatted = formatCPFCNPJ(e.target.value);
                        setCpfCnpj(formatted);
                        if (formatted.replace(/\D/g, '').length >= 11) {
                          setCpfCnpjValidation(validateCPFCNPJ(formatted));
                        } else {
                          setCpfCnpjValidation(null);
                        }
                      }}
                      maxLength={18}
                      className={cpfCnpjValidation ? (cpfCnpjValidation.valid ? "border-green-500 focus-visible:ring-green-500" : "border-red-500 focus-visible:ring-red-500") : ""}
                    />
                    {cpfCnpjValidation && (
                      <p className={`text-sm flex items-center gap-1 ${cpfCnpjValidation.valid ? "text-green-600" : "text-red-600"}`}>
                        {cpfCnpjValidation.valid ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        {cpfCnpjValidation.message}
                      </p>
                    )}
                  </div>

                  <Button 
                    onClick={handleSaveBankAccount} 
                    disabled={isSavingBank || !user}
                    className="w-full bg-spice-forest hover:bg-spice-forest/90"
                  >
                    {isSavingBank ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando dados...
                      </>
                    ) : (
                      <>
                        <Building2 className="mr-2 h-4 w-4" />
                        Salvar Conta Bancária
                      </>
                    )}
                  </Button>

                  {!user && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-800">Login necessário</h4>
                          <p className="text-sm text-amber-700 mt-1">
                            Faça login para salvar sua conta bancária.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Códigos dos principais bancos</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                      <span>0001 - Banco do Brasil</span>
                      <span>0033 - Santander</span>
                      <span>0104 - Caixa Econômica</span>
                      <span>0237 - Bradesco</span>
                      <span>0260 - Nubank</span>
                      <span>0341 - Itaú</span>
                      <span>0077 - Inter</span>
                      <span>0336 - C6 Bank</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* InfinitePay Tab */}
            <TabsContent value="payment" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-spice-forest" />
                    Integração InfinitePay
                  </CardTitle>
                  <CardDescription>
                    Vincule sua conta InfinitePay para processar pagamentos via cartão de crédito, débito e PIX.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Connection Status */}
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                    {connectionStatus === 'connected' ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-700">Conta vinculada</p>
                          <p className="text-sm text-muted-foreground">
                            Handle configurado no servidor (seguro)
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                        <div>
                          <p className="font-medium text-amber-700">Nenhuma conta vinculada</p>
                          <p className="text-sm text-muted-foreground">
                            Configure sua conta para começar a receber pagamentos.
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Configuration Form */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="infinitepay-handle">Handle da InfinitePay</Label>
                      <div className="relative">
                        <Input
                          id="infinitepay-handle"
                          type={showHandle ? "text" : "password"}
                          placeholder="Insira seu handle da InfinitePay"
                          value={infinitePayHandle}
                          onChange={(e) => setInfinitePayHandle(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowHandle(!showHandle)}
                        >
                          {showHandle ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Você encontra seu handle no painel da InfinitePay em Configurações &gt; Integração.
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-2">Como obter seu Handle</h4>
                      <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                        <li>Acesse o painel da InfinitePay</li>
                        <li>Vá em Configurações &gt; Integrações</li>
                        <li>Copie o "Handle" ou "Identificador da conta"</li>
                        <li>Cole aqui e salve</li>
                      </ol>
                    </div>

                    <Button 
                      onClick={handleSavePaymentSettings} 
                      disabled={isLoading || !infinitePayHandle.trim()}
                      className="w-full bg-spice-forest hover:bg-spice-forest/90"
                    >
                      {isLoading ? "Salvando..." : "Vincular conta InfinitePay"}
                    </Button>
                  </div>

                  {/* Info about fees */}
                  <div className="border-t pt-6 space-y-3">
                    <h4 className="font-medium">Taxas e Recebimentos</h4>
                    <div className="grid gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taxa por transação (Crédito)</span>
                        <span className="font-medium">A partir de 4,99%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taxa por transação (PIX)</span>
                        <span className="font-medium">0,75%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prazo de recebimento</span>
                        <span className="font-medium">1 dia útil</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      * Taxas podem variar de acordo com seu plano na InfinitePay.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Store Tab */}
            <TabsContent value="store" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações da Loja</CardTitle>
                  <CardDescription>
                    Personalize as informações da sua loja.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="store-name">Nome da Loja</Label>
                    <Input
                      id="store-name"
                      placeholder="Species - Temperos Naturais"
                      defaultValue="Species - Temperos Naturais"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="store-email">E-mail de contato</Label>
                    <Input
                      id="store-email"
                      type="email"
                      placeholder="contato@species.com.br"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="store-phone">Telefone / WhatsApp</Label>
                    <Input
                      id="store-phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <Button className="w-full bg-spice-forest hover:bg-spice-forest/90">
                    Salvar configurações da loja
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Settings;
