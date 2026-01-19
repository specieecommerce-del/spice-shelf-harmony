import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, CreditCard, ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showHandle, setShowHandle] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  
  // Payment settings
  const [infinitePayHandle, setInfinitePayHandle] = useState("");
  const [savedHandle, setSavedHandle] = useState("");

  useEffect(() => {
    // Load saved settings from localStorage (for demo purposes)
    // In production, this would be fetched from a secure backend
    const saved = localStorage.getItem('infinitepay_handle_preview');
    if (saved) {
      setSavedHandle(saved);
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('disconnected');
    }
  }, []);

  const handleSavePaymentSettings = async () => {
    if (!infinitePayHandle.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, insira o Handle da InfinitePay.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // In a real implementation, this would call an edge function
      // to securely store the handle as a secret
      // For now, we save a preview indicator in localStorage
      localStorage.setItem('infinitepay_handle_preview', maskHandle(infinitePayHandle));
      setSavedHandle(maskHandle(infinitePayHandle));
      setConnectionStatus('connected');
      setInfinitePayHandle("");

      toast({
        title: "Configurações salvas!",
        description: "Sua conta InfinitePay foi vinculada com sucesso. Entre em contato com o suporte para ativar.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('infinitepay_handle_preview');
    setSavedHandle("");
    setConnectionStatus('disconnected');
    toast({
      title: "Conta desvinculada",
      description: "Sua conta InfinitePay foi desvinculada.",
    });
  };

  const maskHandle = (handle: string) => {
    if (handle.length <= 4) return "****";
    return handle.substring(0, 2) + "****" + handle.substring(handle.length - 2);
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

          <Tabs defaultValue="payment" className="space-y-6">
            <TabsList className="grid w-full grid-cols-1 lg:grid-cols-2 h-auto">
              <TabsTrigger value="payment" className="flex items-center gap-2 py-3">
                <CreditCard className="h-4 w-4" />
                Pagamento
              </TabsTrigger>
              <TabsTrigger value="store" className="flex items-center gap-2 py-3">
                <SettingsIcon className="h-4 w-4" />
                Loja
              </TabsTrigger>
            </TabsList>

            <TabsContent value="payment" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-spice-forest" />
                    Conta InfinitePay
                  </CardTitle>
                  <CardDescription>
                    Vincule sua conta InfinitePay para receber pagamentos diretamente na sua conta.
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
                            Handle: {savedHandle}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="ml-auto"
                          onClick={handleDisconnect}
                        >
                          Desvincular
                        </Button>
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
                      {isLoading ? "Salvando..." : "Salvar configurações"}
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
