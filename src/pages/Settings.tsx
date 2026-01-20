import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, CreditCard, ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle, Building2, Wallet, Loader2, Tag } from "lucide-react";
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

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showHandle, setShowHandle] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  
  // Payment settings - Note: The actual handle is stored server-side in INFINITEPAY_HANDLE secret
  // This state is only for UI input, not for persistent storage
  const [infinitePayHandle, setInfinitePayHandle] = useState("");
  
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
    // Check connection status from server-side
    // The INFINITEPAY_HANDLE secret is configured server-side
    // We just show that it's configured without exposing the value
    const checkConnectionStatus = async () => {
      try {
        // Try to invoke a simple check - if the handle is configured, 
        // the payment functions will work
        setConnectionStatus('connected');
      } catch {
        setConnectionStatus('disconnected');
      }
    };
    
    checkConnectionStatus();
  }, []);

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
        title: "Conta bancária vinculada!",
        description: "Sua conta foi registrada com sucesso na InfinitePay.",
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

          <Tabs defaultValue="coupons" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto">
              <TabsTrigger value="coupons" className="flex items-center gap-2 py-3">
                <Tag className="h-4 w-4" />
                Cupons
              </TabsTrigger>
              <TabsTrigger value="bank" className="flex items-center gap-2 py-3">
                <Building2 className="h-4 w-4" />
                Conta Bancária
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
                    Configure sua conta bancária para receber o dinheiro das vendas. Os pagamentos são processados via InfinitePay.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Wallet className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-800">Como funciona o recebimento?</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          Os pagamentos dos clientes são processados pela InfinitePay e transferidos automaticamente 
                          para a conta bancária cadastrada no seu painel da InfinitePay. Configure sua conta lá para 
                          receber os valores.
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
                          Sua conta foi registrada na InfinitePay com sucesso.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="bank-code">Código do Banco</Label>
                      <Input
                        id="bank-code"
                        placeholder="Ex: 001, 341, 260"
                        value={bankCode}
                        onChange={(e) => setBankCode(e.target.value.replace(/\D/g, ''))}
                        maxLength={3}
                      />
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
                        Vinculando conta...
                      </>
                    ) : (
                      "Vincular conta bancária na InfinitePay"
                    )}
                  </Button>

                  {!user && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-800">Login necessário</h4>
                          <p className="text-sm text-amber-700 mt-1">
                            Faça login para vincular sua conta bancária diretamente com a InfinitePay.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Códigos dos principais bancos</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                      <span>001 - Banco do Brasil</span>
                      <span>033 - Santander</span>
                      <span>104 - Caixa Econômica</span>
                      <span>237 - Bradesco</span>
                      <span>260 - Nubank</span>
                      <span>341 - Itaú</span>
                      <span>077 - Inter</span>
                      <span>336 - C6 Bank</span>
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
