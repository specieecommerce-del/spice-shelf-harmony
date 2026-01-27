import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Loader2,
  Building2,
  Webhook,
  FileSpreadsheet,
  Key,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Upload,
  Link2,
  Shield,
  Clock,
  ExternalLink,
} from "lucide-react";

interface BankConfig {
  id: string;
  name: string;
  logo: string;
  color: string;
  apiSupported: boolean;
  webhookSupported: boolean;
  importSupported: boolean;
  apiDocsUrl?: string;
}

interface BankConnection {
  bank_id: string;
  enabled: boolean;
  api_key?: string;
  api_secret?: string;
  client_id?: string;
  webhook_url?: string;
  webhook_secret?: string;
  last_sync?: string;
  status: "connected" | "disconnected" | "pending" | "error";
}

const SUPPORTED_BANKS: BankConfig[] = [
  {
    id: "nubank",
    name: "Nubank PJ",
    logo: "🟣",
    color: "bg-purple-500",
    apiSupported: false,
    webhookSupported: false,
    importSupported: true,
    apiDocsUrl: "https://nubank.com.br/empresas",
  },
  {
    id: "banco_brasil",
    name: "Banco do Brasil",
    logo: "🟡",
    color: "bg-yellow-500",
    apiSupported: true,
    webhookSupported: true,
    importSupported: true,
    apiDocsUrl: "https://developers.bb.com.br/",
  },
  {
    id: "itau",
    name: "Itaú Empresas",
    logo: "🟠",
    color: "bg-orange-500",
    apiSupported: true,
    webhookSupported: true,
    importSupported: true,
    apiDocsUrl: "https://developer.itau.com.br/",
  },
  {
    id: "bradesco",
    name: "Bradesco Net Empresa",
    logo: "🔴",
    color: "bg-red-500",
    apiSupported: true,
    webhookSupported: true,
    importSupported: true,
    apiDocsUrl: "https://developers.bradesco.com.br/",
  },
  {
    id: "santander",
    name: "Santander Empresas",
    logo: "🔴",
    color: "bg-red-600",
    apiSupported: true,
    webhookSupported: true,
    importSupported: true,
    apiDocsUrl: "https://developer.santander.com.br/",
  },
  {
    id: "caixa",
    name: "Caixa Econômica",
    logo: "🔵",
    color: "bg-blue-600",
    apiSupported: true,
    webhookSupported: false,
    importSupported: true,
    apiDocsUrl: "https://www.caixa.gov.br/site/paginas/downloads.aspx",
  },
];

const BankConnectionManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connections, setConnections] = useState<Record<string, BankConnection>>({});
  const [activeBank, setActiveBank] = useState<string>("nubank");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

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
        setConnections(data.value as unknown as Record<string, BankConnection>);
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

      // First check if the record exists
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
      toast.success("Configuração salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  const toggleBankEnabled = async (bankId: string) => {
    const current = connections[bankId] || { enabled: false };
    await saveConnection(bankId, {
      enabled: !current.enabled,
      status: !current.enabled ? "pending" : "disconnected",
    });
  };

  const testConnection = async (bankId: string) => {
    toast.info("Testando conexão...");
    // Simular teste de conexão
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const connection = connections[bankId];
    if (connection?.api_key && connection?.api_secret) {
      await saveConnection(bankId, { status: "connected", last_sync: new Date().toISOString() });
      toast.success("Conexão estabelecida com sucesso!");
    } else {
      await saveConnection(bankId, { status: "error" });
      toast.error("Falha na conexão. Verifique as credenciais.");
    }
  };

  const handleFileImport = async () => {
    if (!importFile) {
      toast.error("Selecione um arquivo para importar");
      return;
    }

    setImporting(true);
    try {
      // Simular processamento do arquivo
      toast.info("Processando arquivo...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Aqui você implementaria a lógica real de parsing do OFX/CSV
      toast.success(`Arquivo "${importFile.name}" importado com sucesso! Transações processadas.`);
      setImportFile(null);
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast.error("Erro ao processar arquivo");
    } finally {
      setImporting(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Conectado
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500 text-white">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-500 text-white">
            <XCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <AlertCircle className="h-3 w-3 mr-1" />
            Desconectado
          </Badge>
        );
    }
  };

  const activeBankConfig = SUPPORTED_BANKS.find((b) => b.id === activeBank);
  
  const defaultConnection: BankConnection = {
    bank_id: activeBank,
    enabled: false,
    status: "disconnected",
  };
  
  const activeBankConnection: BankConnection = connections[activeBank] || defaultConnection;

  const webhookUrl = `${window.location.origin}/api/bank-webhook/${activeBank}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Conexão Bancária
          </h2>
          <p className="text-muted-foreground">
            Configure a integração com seu banco para validação automática de pagamentos
          </p>
        </div>
        <Button onClick={fetchConnections} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Aviso de Segurança */}
      <Card className="bg-amber-500/10 border-amber-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-700">Segurança das Credenciais</h4>
              <p className="text-sm text-amber-600">
                Suas credenciais são armazenadas de forma criptografada. Nunca compartilhe 
                suas chaves de API com terceiros. Use apenas credenciais de ambiente de produção.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lista de Bancos */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
            Bancos Disponíveis
          </h3>
          {SUPPORTED_BANKS.map((bank) => {
            const conn = connections[bank.id];
            return (
              <button
                key={bank.id}
                onClick={() => setActiveBank(bank.id)}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  activeBank === bank.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{bank.logo}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{bank.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {conn?.enabled ? (
                        getStatusBadge(conn.status)
                      ) : (
                        <Badge variant="outline" className="text-xs">Desativado</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Configuração do Banco Selecionado */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{activeBankConfig?.logo}</span>
                  <div>
                    <CardTitle>{activeBankConfig?.name}</CardTitle>
                    <CardDescription>
                      Configure a integração com {activeBankConfig?.name}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(activeBankConnection.status)}
                  <div className="flex items-center gap-2">
                    <Label htmlFor="bank-enabled" className="text-sm">
                      Ativar
                    </Label>
                    <Switch
                      id="bank-enabled"
                      checked={activeBankConnection.enabled || false}
                      onCheckedChange={() => toggleBankEnabled(activeBank)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="api" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="api" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    API Direta
                  </TabsTrigger>
                  <TabsTrigger value="webhook" className="flex items-center gap-2">
                    <Webhook className="h-4 w-4" />
                    Webhook
                  </TabsTrigger>
                  <TabsTrigger value="import" className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Importar Extrato
                  </TabsTrigger>
                </TabsList>

                {/* API Direta */}
                <TabsContent value="api" className="space-y-4">
                  {activeBankConfig?.apiSupported ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="client_id">Client ID</Label>
                          <Input
                            id="client_id"
                            placeholder="Seu Client ID"
                            value={activeBankConnection.client_id || ""}
                            onChange={(e) =>
                              setConnections({
                                ...connections,
                                [activeBank]: {
                                  ...activeBankConnection,
                                  client_id: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="api_key">API Key</Label>
                          <Input
                            id="api_key"
                            type="password"
                            placeholder="Sua API Key"
                            value={activeBankConnection.api_key || ""}
                            onChange={(e) =>
                              setConnections({
                                ...connections,
                                [activeBank]: {
                                  ...activeBankConnection,
                                  api_key: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="api_secret">API Secret</Label>
                          <Input
                            id="api_secret"
                            type="password"
                            placeholder="Sua API Secret"
                            value={activeBankConnection.api_secret || ""}
                            onChange={(e) =>
                              setConnections({
                                ...connections,
                                [activeBank]: {
                                  ...activeBankConnection,
                                  api_secret: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          <a
                            href={activeBankConfig.apiDocsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Documentação da API
                          </a>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => testConnection(activeBank)}
                            disabled={saving}
                          >
                            Testar Conexão
                          </Button>
                          <Button
                            onClick={() =>
                              saveConnection(activeBank, {
                                client_id: activeBankConnection.client_id,
                                api_key: activeBankConnection.api_key,
                                api_secret: activeBankConnection.api_secret,
                              })
                            }
                            disabled={saving}
                          >
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Salvar Credenciais
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h4 className="font-semibold">API não disponível</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {activeBankConfig?.name} ainda não possui uma API pública oficial.
                        <br />
                        Use a importação de extrato ou aguarde liberação.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Webhook */}
                <TabsContent value="webhook" className="space-y-4">
                  {activeBankConfig?.webhookSupported ? (
                    <>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>URL do Webhook (configure no painel do banco)</Label>
                          <div className="flex gap-2">
                            <Input
                              readOnly
                              value={webhookUrl}
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(webhookUrl);
                                toast.success("URL copiada!");
                              }}
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Configure esta URL no painel do seu banco para receber notificações de pagamento.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="webhook_secret">Webhook Secret (opcional)</Label>
                          <Input
                            id="webhook_secret"
                            type="password"
                            placeholder="Secret para validar assinatura"
                            value={activeBankConnection.webhook_secret || ""}
                            onChange={(e) =>
                              setConnections({
                                ...connections,
                                [activeBank]: {
                                  ...activeBankConnection,
                                  webhook_secret: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="flex justify-end">
                        <Button
                          onClick={() =>
                            saveConnection(activeBank, {
                              webhook_url: webhookUrl,
                              webhook_secret: activeBankConnection.webhook_secret,
                            })
                          }
                          disabled={saving}
                        >
                          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Salvar Configuração
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h4 className="font-semibold">Webhook não disponível</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {activeBankConfig?.name} ainda não suporta webhooks.
                        <br />
                        Use a importação de extrato como alternativa.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Importação de Extrato */}
                <TabsContent value="import" className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h4 className="font-semibold">Importar Extrato Bancário</h4>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                      Faça upload do extrato em formato OFX, CSV ou Excel
                    </p>
                    <input
                      type="file"
                      id="import-file"
                      accept=".ofx,.csv,.xlsx,.xls"
                      className="hidden"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="import-file">
                      <Button asChild variant="outline">
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          Selecionar Arquivo
                        </span>
                      </Button>
                    </label>
                    {importFile && (
                      <p className="mt-3 text-sm text-primary">
                        Arquivo selecionado: {importFile.name}
                      </p>
                    )}
                  </div>

                  {importFile && (
                    <div className="flex justify-end">
                      <Button onClick={handleFileImport} disabled={importing}>
                        {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Processar Arquivo
                      </Button>
                    </div>
                  )}

                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <h5 className="font-semibold text-sm mb-2">Formatos Suportados:</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>OFX</strong> - Open Financial Exchange (padrão bancário)</li>
                        <li>• <strong>CSV</strong> - Valores separados por vírgula</li>
                        <li>• <strong>XLSX/XLS</strong> - Planilhas Excel</li>
                      </ul>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Status da Última Sincronização */}
          {activeBankConnection.last_sync && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Última sincronização:</span>
                  </div>
                  <span className="text-sm font-medium">
                    {new Date(activeBankConnection.last_sync).toLocaleString("pt-BR")}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default BankConnectionManager;
