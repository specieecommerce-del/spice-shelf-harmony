import { useState, useEffect, useCallback } from "react";
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
  Shield,
  Zap,
  Eye,
  EyeOff,
  Save,
  Play,
  Clock,
  Activity,
  Timer,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

interface BankConfig {
  id: string;
  name: string;
  logo: string;
}

interface BankConnection {
  bank_id: string;
  enabled: boolean;
  pix_key?: string;
  last_sync?: string;
  status: "connected" | "disconnected" | "pending" | "error";
}

interface AutoVerificationStatus {
  timestamp: string;
  verified: number;
  confirmed: number;
  still_pending: number;
}

interface VerificationResult {
  success: boolean;
  timestamp?: string;
  verified: number;
  confirmed: number;
  still_pending: number;
  results?: Array<{ order_nsu: string; status: string; source?: string; message?: string }>;
}

const SUPPORTED_BANKS: BankConfig[] = [
  { id: "nubank", name: "Nubank", logo: "🟣" },
  { id: "banco_brasil", name: "Banco do Brasil", logo: "🟡" },
  { id: "itau", name: "Itaú", logo: "🟠" },
  { id: "bradesco", name: "Bradesco", logo: "🔴" },
  { id: "santander", name: "Santander", logo: "🔴" },
  { id: "caixa", name: "Caixa", logo: "🔵" },
  { id: "inter", name: "Inter", logo: "🟠" },
  { id: "c6bank", name: "C6 Bank", logo: "⚫" },
];

const BankConnectionManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [connections, setConnections] = useState<Record<string, BankConnection>>({});
  const [showPixKey, setShowPixKey] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [lastAutoVerification, setLastAutoVerification] = useState<AutoVerificationStatus | null>(null);
  const [lastManualResult, setLastManualResult] = useState<VerificationResult | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [connectionsRes, verificationRes] = await Promise.all([
        supabase.from("store_settings").select("value").eq("key", "bank_connections").maybeSingle(),
        supabase.from("store_settings").select("value").eq("key", "last_auto_verification").maybeSingle(),
      ]);

      if (connectionsRes.data?.value && typeof connectionsRes.data.value === 'object' && !Array.isArray(connectionsRes.data.value)) {
        const conns = connectionsRes.data.value as unknown as Record<string, BankConnection>;
        setConnections(conns);
        const connectedBank = Object.values(conns).find(c => c.status === "connected");
        if (connectedBank?.pix_key) setPixKey(connectedBank.pix_key);
      }

      if (verificationRes.data?.value && typeof verificationRes.data.value === 'object') {
        setLastAutoVerification(verificationRes.data.value as unknown as AutoVerificationStatus);
      }
    } catch (error) {
      console.error("Erro ao carregar:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30s to show latest auto-verification status
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "last_auto_verification")
        .maybeSingle();
      if (data?.value && typeof data.value === 'object') {
        setLastAutoVerification(data.value as unknown as AutoVerificationStatus);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const saveConnection = async (bankId: string, config: Partial<BankConnection>) => {
    setSaving(true);
    try {
      const currentConnection = connections[bankId] || { bank_id: bankId, enabled: false, status: "disconnected" as const };
      const updatedConnections = {
        ...connections,
        [bankId]: { ...currentConnection, ...config, bank_id: bankId },
      };

      const { data: existing } = await supabase.from("store_settings").select("id").eq("key", "bank_connections").maybeSingle();

      if (existing) {
        const { error } = await supabase.from("store_settings").update({
          value: updatedConnections as unknown as Json,
          updated_at: new Date().toISOString(),
        }).eq("key", "bank_connections");
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_settings").insert({
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
      toast.success(`Conectado ao ${SUPPORTED_BANKS.find(b => b.id === bankId)?.name}! Verificação automática ativada.`);
    }
    setSelectedBank(null);
  };

  const disconnectBank = async (bankId: string) => {
    await saveConnection(bankId, { enabled: false, status: "disconnected" });
    toast.success("Banco desconectado");
  };

  const runManualVerification = async () => {
    setVerifying(true);
    try {
      toast.info("Verificando pagamentos pendentes...");
      const { data, error } = await supabase.functions.invoke('verify-pending-payments');
      if (error) throw error;

      setLastManualResult(data);

      if (data.confirmed > 0) {
        toast.success(`🎉 ${data.confirmed} pagamento(s) confirmado(s)!`);
      } else if (data.verified > 0) {
        toast.info(`${data.verified} pedido(s) verificado(s), nenhum novo pagamento encontrado`);
      } else {
        toast.info("Nenhum pedido pendente para verificar");
      }

      // Refresh auto-verification status
      const { data: verData } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "last_auto_verification")
        .maybeSingle();
      if (verData?.value && typeof verData.value === 'object') {
        setLastAutoVerification(verData.value as unknown as AutoVerificationStatus);
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao verificar pagamentos");
    } finally {
      setVerifying(false);
    }
  };

  const connectedBank = Object.entries(connections).find(([_, conn]) => conn.status === "connected");
  const connectedBankConfig = connectedBank ? SUPPORTED_BANKS.find(b => b.id === connectedBank[0]) : null;
  const isAutoActive = !!connectedBank;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            Verificação Automática de Pagamentos
          </h2>
          <p className="text-muted-foreground">
            O sistema verifica e confirma pagamentos automaticamente a cada 5 minutos
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Auto-Verification Status Banner */}
      <Card className={isAutoActive ? "border-green-500/50 bg-green-500/5" : "border-yellow-500/50 bg-yellow-500/5"}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-full flex items-center justify-center ${isAutoActive ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                {isAutoActive ? (
                  <Activity className="h-7 w-7 text-green-500 animate-pulse" />
                ) : (
                  <AlertTriangle className="h-7 w-7 text-yellow-500" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {isAutoActive ? (
                    <>
                      <Badge className="bg-green-600 text-white">ATIVO</Badge>
                      Verificação Automática Ativa
                    </>
                  ) : (
                    <>
                      <Badge variant="secondary">INATIVO</Badge>
                      Verificação Automática Desativada
                    </>
                  )}
                </h3>
                {isAutoActive ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Timer className="h-3.5 w-3.5" />
                    Verificando a cada 5 minutos via PagSeguro + Conferência automática
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    Conecte seu banco abaixo para ativar a verificação automática
                  </p>
                )}
                {lastAutoVerification?.timestamp && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Última verificação: {new Date(lastAutoVerification.timestamp).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={runManualVerification} disabled={verifying} variant={isAutoActive ? "outline" : "default"}>
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Verificar Agora
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {(lastAutoVerification || lastManualResult) && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-blue-600">
                {lastManualResult?.verified ?? lastAutoVerification?.verified ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Pedidos Verificados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-green-600">
                {lastManualResult?.confirmed ?? lastAutoVerification?.confirmed ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Confirmados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-yellow-600">
                {lastManualResult?.still_pending ?? lastAutoVerification?.still_pending ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Ainda Pendentes</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manual Verification Results */}
      {lastManualResult?.results && lastManualResult.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Resultado da Última Verificação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lastManualResult.results.map((result, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                  <span className="font-mono text-sm">{result.order_nsu}</span>
                  <div className="flex items-center gap-2">
                    {result.source && (
                      <span className="text-xs text-muted-foreground">{result.source}</span>
                    )}
                    <Badge
                      variant={result.status === 'confirmed' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}
                      className={result.status === 'confirmed' ? 'bg-green-600' : ''}
                    >
                      {result.status === 'confirmed' ? '✅ Confirmado' : result.status === 'error' ? '❌ Erro' : '⏳ Pendente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bank Connection */}
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
                    Chave PIX: {showPixKey ? connectedBank[1].pix_key : '••••••••••'}
                    <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={() => setShowPixKey(!showPixKey)}>
                      {showPixKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </p>
                </div>
              </div>
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
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Conectar Banco
            </CardTitle>
            <CardDescription>
              Informe sua chave PIX e selecione seu banco para ativar a verificação automática
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SUPPORTED_BANKS.map((bank) => {
                const isConnecting = selectedBank === bank.id && saving;
                const isConnected = connections[bank.id]?.status === "connected";
                return (
                  <Button
                    key={bank.id}
                    variant={isConnected ? "default" : "outline"}
                    className={`h-auto py-4 flex flex-col items-center gap-2 ${isConnected ? 'bg-green-600 hover:bg-green-700' : ''}`}
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

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Conexão Segura</p>
                <p className="text-xs text-muted-foreground">
                  Seus dados são usados apenas para identificar pagamentos recebidos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como Funciona</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-medium text-sm">1. Conecte</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Informe sua chave PIX e selecione o banco
              </p>
            </div>
            <div className="text-center p-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Timer className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-medium text-sm">2. Automático</h4>
              <p className="text-xs text-muted-foreground mt-1">
                O sistema verifica pagamentos a cada 5 minutos
              </p>
            </div>
            <div className="text-center p-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-medium text-sm">3. Consulta</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Consulta PagSeguro e confirma pagamentos recebidos
              </p>
            </div>
            <div className="text-center p-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <h4 className="font-medium text-sm">4. Confirmado</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Pedidos são confirmados e cliente notificado
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BankConnectionManager;
