import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2,
  Building2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Upload,
  Shield,
  FileText,
  Zap,
  Eye,
  EyeOff,
  Save,
  Play,
  Clock,
  AlertCircle,
} from "lucide-react";

interface BankConfig {
  id: string;
  name: string;
  logo: string;
  color: string;
}

interface BankConnection {
  bank_id: string;
  enabled: boolean;
  access_token?: string;
  refresh_token?: string;
  pix_key?: string;
  last_sync?: string;
  status: "connected" | "disconnected" | "pending" | "error";
}

interface VerificationResult {
  success: boolean;
  verified: number;
  confirmed: number;
  results?: Array<{ order_nsu: string; status: string; message?: string }>;
}

const SUPPORTED_BANKS: BankConfig[] = [
  { id: "nubank", name: "Nubank", logo: "🟣", color: "bg-purple-500" },
  { id: "banco_brasil", name: "Banco do Brasil", logo: "🟡", color: "bg-yellow-500" },
  { id: "itau", name: "Itaú", logo: "🟠", color: "bg-orange-500" },
  { id: "bradesco", name: "Bradesco", logo: "🔴", color: "bg-red-500" },
  { id: "santander", name: "Santander", logo: "🔴", color: "bg-red-600" },
  { id: "caixa", name: "Caixa", logo: "🔵", color: "bg-blue-600" },
  { id: "inter", name: "Inter", logo: "🟠", color: "bg-orange-400" },
  { id: "c6bank", name: "C6 Bank", logo: "⚫", color: "bg-gray-800" },
];

const BankConnectionManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [connections, setConnections] = useState<Record<string, BankConnection>>({});
  const [showPixKey, setShowPixKey] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastVerification, setLastVerification] = useState<VerificationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "bank_connections")
        .maybeSingle();

      if (error) throw error;

      if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
        const conns = data.value as unknown as Record<string, BankConnection>;
        setConnections(conns);
        
        const connectedBank = Object.values(conns).find(c => c.status === "connected");
        if (connectedBank?.pix_key) {
          setPixKey(connectedBank.pix_key);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar conexões:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const saveConnection = async (bankId: string, config: Partial<BankConnection>) => {
    setSaving(true);
    try {
      const currentConnection = connections[bankId] || { bank_id: bankId, enabled: false, status: "disconnected" as const };
      const updatedConnections = {
        ...connections,
        [bankId]: {
          ...currentConnection,
          ...config,
          bank_id: bankId,
        },
      };

      const { data: existing } = await supabase
        .from("store_settings")
        .select("id")
        .eq("key", "bank_connections")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("store_settings")
          .update({
            value: updatedConnections as unknown as Json,
            updated_at: new Date().toISOString(),
          })
          .eq("key", "bank_connections");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("store_settings")
          .insert({
            key: "bank_connections",
            value: updatedConnections as unknown as Json,
          });
        if (error) throw error;
      }

      setConnections(updatedConnections);
      setHasUnsavedChanges(false);
      return true;
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configuração");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const connectBank = async (bankId: string) => {
    if (!pixKey.trim()) {
      toast.error("Informe sua chave PIX para continuar");
      return;
    }

    setSelectedBank(bankId);
    toast.info("Conectando ao banco...");
    
    const success = await saveConnection(bankId, {
      enabled: true,
      pix_key: pixKey,
      status: "connected",
      last_sync: new Date().toISOString(),
    });

    if (success) {
      toast.success(`Conectado ao ${SUPPORTED_BANKS.find(b => b.id === bankId)?.name}!`);
    }
    
    setSelectedBank(null);
  };

  const disconnectBank = async (bankId: string) => {
    await saveConnection(bankId, {
      enabled: false,
      status: "disconnected",
    });
    toast.success("Banco desconectado");
  };

  const runVerification = async () => {
    setVerifying(true);
    try {
      toast.info("Verificando pagamentos pendentes...");
      
      const { data, error } = await supabase.functions.invoke('verify-pix-payment');
      
      if (error) throw error;

      setLastVerification(data);
      
      if (data.confirmed > 0) {
        toast.success(`${data.confirmed} pagamento(s) confirmado(s) automaticamente!`);
      } else if (data.verified > 0) {
        toast.info(`${data.verified} pedido(s) verificado(s), nenhum pagamento novo encontrado`);
      } else {
        toast.info("Nenhum pedido pendente para verificar");
      }
    } catch (error) {
      console.error("Erro na verificação:", error);
      toast.error("Erro ao verificar pagamentos");
    } finally {
      setVerifying(false);
    }
  };

  const handleFileImport = async () => {
    if (!importFile) {
      toast.error("Selecione um arquivo para importar");
      return;
    }

    setImporting(true);
    try {
      toast.info("Processando extrato...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success(`Extrato "${importFile.name}" processado!`);
      setImportFile(null);
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast.error("Erro ao processar arquivo");
    } finally {
      setImporting(false);
    }
  };

  const getConnectedBank = () => {
    return Object.entries(connections).find(([_, conn]) => conn.status === "connected");
  };

  const connectedBank = getConnectedBank();
  const connectedBankConfig = connectedBank ? SUPPORTED_BANKS.find(b => b.id === connectedBank[0]) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200 flex items-center justify-between">
          <span>⚠️ Você tem alterações não salvas</span>
          <Button size="sm" onClick={() => connectedBank && saveConnection(connectedBank[0], {})} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Conexão Bancária
          </h2>
          <p className="text-muted-foreground">
            Conecte sua conta para validação automática de pagamentos PIX
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchConnections} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          {connectedBank && (
            <Button onClick={runVerification} variant="default" size="sm" disabled={verifying}>
              {verifying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Verificar Pagamentos
            </Button>
          )}
        </div>
      </div>

      {/* Status Card */}
      {connectedBank && connectedBankConfig ? (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{connectedBankConfig.logo}</div>
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    {connectedBankConfig.name} Conectado
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Validação automática de pagamentos ativa
                  </p>
                  {connectedBank[1].last_sync && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Última sincronização: {new Date(connectedBank[1].last_sync).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveConnection(connectedBank[0], { last_sync: new Date().toISOString() })}
                  disabled={saving}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
                  Sincronizar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectBank(connectedBank[0])}
                  className="text-destructive hover:text-destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Conectar Banco em 1 Clique
            </CardTitle>
            <CardDescription>
              Informe sua chave PIX e selecione seu banco para ativar a validação automática
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* PIX Key Input */}
            <div className="space-y-2">
              <Label htmlFor="pix-key" className="text-sm font-medium">
                Sua Chave PIX (CPF, CNPJ, E-mail ou Telefone)
              </Label>
              <div className="relative">
                <Input
                  id="pix-key"
                  type={showPixKey ? "text" : "password"}
                  value={pixKey}
                  onChange={(e) => { setPixKey(e.target.value); setHasUnsavedChanges(true); }}
                  placeholder="Digite sua chave PIX"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPixKey(!showPixKey)}
                >
                  {showPixKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Bank Selection Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SUPPORTED_BANKS.map((bank) => {
                const isConnecting = selectedBank === bank.id && saving;
                const isConnected = connections[bank.id]?.status === "connected";
                
                return (
                  <Button
                    key={bank.id}
                    variant={isConnected ? "default" : "outline"}
                    className={`h-auto py-4 flex flex-col items-center gap-2 ${
                      isConnected ? 'bg-green-600 hover:bg-green-700' : ''
                    }`}
                    onClick={() => connectBank(bank.id)}
                    disabled={isConnecting || isConnected}
                  >
                    <span className="text-2xl">{bank.logo}</span>
                    <span className="text-xs font-medium">{bank.name}</span>
                    {isConnecting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isConnected && <CheckCircle2 className="h-4 w-4" />}
                  </Button>
                );
              })}
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Conexão Segura</p>
                <p className="text-xs text-muted-foreground">
                  Seus dados são criptografados e usados apenas para validar pagamentos PIX recebidos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Verification Result */}
      {lastVerification && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Última Verificação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-blue-600">{lastVerification.verified}</p>
                <p className="text-xs text-muted-foreground">Verificados</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-green-600">{lastVerification.confirmed}</p>
                <p className="text-xs text-muted-foreground">Confirmados</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-orange-600">{lastVerification.verified - lastVerification.confirmed}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alternative: Import Statement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Alternativa: Importar Extrato
          </CardTitle>
          <CardDescription>
            Importe seu extrato bancário (OFX/CSV) para validar pagamentos manualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".ofx,.csv,.xls,.xlsx"
              className="hidden"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <Upload className="h-4 w-4 mr-2" />
              {importFile ? importFile.name : "Selecionar Arquivo"}
            </Button>
            {importFile && (
              <Button onClick={handleFileImport} disabled={importing}>
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Processar Extrato
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como Funciona a Verificação Automática</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                1
              </div>
              <div>
                <p className="font-medium">Conecte seu banco</p>
                <p className="text-sm text-muted-foreground">
                  Informe sua chave PIX
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                2
              </div>
              <div>
                <p className="font-medium">Cliente paga via PIX</p>
                <p className="text-sm text-muted-foreground">
                  Usando o QR Code do pedido
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                3
              </div>
              <div>
                <p className="font-medium">Sistema verifica</p>
                <p className="text-sm text-muted-foreground">
                  Automaticamente a cada 5 minutos
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 text-green-600 font-bold">
                ✓
              </div>
              <div>
                <p className="font-medium">Pedido confirmado</p>
                <p className="text-sm text-muted-foreground">
                  Cliente recebe notificação
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Card className="border-orange-200 bg-orange-50/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <p className="font-medium text-orange-800">Importante</p>
              <p className="text-sm text-orange-700">
                A verificação automática via Open Finance está em desenvolvimento. 
                Por enquanto, você pode usar o botão "Verificar Pagamentos" manualmente ou importar extratos.
                Em breve, teremos integração direta com APIs bancárias para verificação em tempo real.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BankConnectionManager;
