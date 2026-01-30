import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  FileSpreadsheet,
  Search,
  Check,
  X,
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

interface BankTransaction {
  date: string;
  amount: number;
  description: string;
  type: 'credit' | 'debit';
  reference?: string;
}

interface ReconciliationResult {
  order_nsu: string;
  order_amount: number;
  matched_transaction: BankTransaction | null;
  status: 'matched' | 'not_found' | 'amount_mismatch';
  confidence: number;
}

interface VerificationResult {
  success: boolean;
  verified: number;
  confirmed: number;
  results?: Array<{ order_nsu: string; status: string; message?: string }>;
}

interface ReconciliationResponse {
  success: boolean;
  transactions_processed: number;
  orders_checked: number;
  matched: number;
  confirmed: number;
  results: ReconciliationResult[];
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
  const [reconciliationResults, setReconciliationResults] = useState<ReconciliationResponse | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<BankTransaction[]>([]);
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [showTransactions, setShowTransactions] = useState(false);
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

  // Parse CSV file
  const parseCSV = (content: string): BankTransaction[] => {
    const lines = content.split('\n').filter(line => line.trim());
    const transactions: BankTransaction[] = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Try different CSV formats
      const parts = line.split(/[,;]/).map(p => p.trim().replace(/"/g, ''));
      
      if (parts.length >= 3) {
        // Common format: Date, Description, Amount or Date, Amount, Description
        let date = '', description = '', amount = 0;
        
        // Try to find date (DD/MM/YYYY or YYYY-MM-DD)
        const datePattern = /(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/;
        const amountPattern = /-?\d+[.,]?\d*/;
        
        for (const part of parts) {
          if (datePattern.test(part) && !date) {
            date = part;
          } else if (amountPattern.test(part.replace(/[R$\s]/g, '')) && amount === 0) {
            const cleanAmount = part.replace(/[R$\s]/g, '').replace(',', '.');
            amount = parseFloat(cleanAmount) || 0;
          } else if (part.length > 3 && !description) {
            description = part;
          }
        }
        
        if (date && amount !== 0) {
          transactions.push({
            date: date.includes('/') ? 
              date.split('/').reverse().join('-') : // DD/MM/YYYY -> YYYY-MM-DD
              date,
            amount: Math.abs(amount),
            description: description || 'Transação bancária',
            type: amount > 0 ? 'credit' : 'debit',
          });
        }
      }
    }
    
    return transactions;
  };

  // Parse OFX file
  const parseOFX = (content: string): BankTransaction[] => {
    const transactions: BankTransaction[] = [];
    
    // Simple OFX parser - extract STMTTRN blocks
    const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;
    
    while ((match = transactionRegex.exec(content)) !== null) {
      const block = match[1];
      
      // Extract fields
      const dtPosted = block.match(/<DTPOSTED>(\d{8})/)?.[1];
      const trnAmt = block.match(/<TRNAMT>(-?[\d.]+)/)?.[1];
      const memo = block.match(/<MEMO>([^<]*)/)?.[1] || block.match(/<NAME>([^<]*)/)?.[1];
      
      if (dtPosted && trnAmt) {
        const amount = parseFloat(trnAmt);
        const year = dtPosted.substring(0, 4);
        const month = dtPosted.substring(4, 6);
        const day = dtPosted.substring(6, 8);
        
        transactions.push({
          date: `${year}-${month}-${day}`,
          amount: Math.abs(amount),
          description: memo || 'Transação OFX',
          type: amount > 0 ? 'credit' : 'debit',
        });
      }
    }
    
    return transactions;
  };

  // Parse Excel-like format (tab or semicolon separated)
  const parseExcel = (content: string): BankTransaction[] => {
    // Similar to CSV but with tab separator
    const lines = content.split('\n').filter(line => line.trim());
    const transactions: BankTransaction[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split('\t').map(p => p.trim());
      
      if (parts.length >= 2) {
        let date = '', description = '', amount = 0;
        
        for (const part of parts) {
          const datePattern = /(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/;
          const amountPattern = /-?\d+[.,]?\d*/;
          
          if (datePattern.test(part) && !date) {
            date = part;
          } else if (amountPattern.test(part.replace(/[R$\s]/g, '')) && amount === 0) {
            const cleanAmount = part.replace(/[R$\s]/g, '').replace(',', '.');
            amount = parseFloat(cleanAmount) || 0;
          } else if (part.length > 3 && !description) {
            description = part;
          }
        }
        
        if (date && amount !== 0) {
          transactions.push({
            date: date.includes('/') ? 
              date.split('/').reverse().join('-') : 
              date,
            amount: Math.abs(amount),
            description: description || 'Transação',
            type: amount > 0 ? 'credit' : 'debit',
          });
        }
      }
    }
    
    return transactions;
  };

  const handleFileImport = async () => {
    if (!importFile) {
      toast.error("Selecione um arquivo para importar");
      return;
    }

    setImporting(true);
    try {
      toast.info("Lendo extrato bancário...");
      
      const content = await importFile.text();
      let transactions: BankTransaction[] = [];
      
      const fileName = importFile.name.toLowerCase();
      
      if (fileName.endsWith('.ofx')) {
        transactions = parseOFX(content);
      } else if (fileName.endsWith('.csv')) {
        transactions = parseCSV(content);
      } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
        // For Excel files, try parsing as tab-separated
        transactions = parseExcel(content);
      } else {
        // Try CSV first, then OFX
        transactions = parseCSV(content);
        if (transactions.length === 0) {
          transactions = parseOFX(content);
        }
      }

      if (transactions.length === 0) {
        toast.error("Não foi possível extrair transações do arquivo. Verifique o formato.");
        setImporting(false);
        return;
      }

      setParsedTransactions(transactions);
      setShowTransactions(true);
      toast.success(`${transactions.length} transações encontradas no extrato!`);
      
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast.error("Erro ao processar arquivo");
    } finally {
      setImporting(false);
    }
  };

  const processReconciliation = async () => {
    if (parsedTransactions.length === 0) {
      toast.error("Nenhuma transação para processar");
      return;
    }

    setImporting(true);
    try {
      toast.info("Reconciliando pagamentos com pedidos pendentes...");
      
      const { data, error } = await supabase.functions.invoke('process-bank-statement', {
        body: {
          transactions: parsedTransactions,
          autoConfirm,
        },
      });

      if (error) throw error;

      setReconciliationResults(data);
      
      if (data.confirmed > 0) {
        toast.success(`🎉 ${data.confirmed} pagamento(s) confirmado(s) automaticamente!`);
      } else if (data.matched > 0) {
        toast.info(`${data.matched} correspondência(s) encontrada(s). Revise e confirme manualmente.`);
      } else {
        toast.info("Nenhuma correspondência encontrada entre o extrato e os pedidos pendentes.");
      }

      // Update last sync
      const connectedBank = getConnectedBank();
      if (connectedBank) {
        await saveConnection(connectedBank[0], { last_sync: new Date().toISOString() });
      }

    } catch (error) {
      console.error("Erro na reconciliação:", error);
      toast.error("Erro ao processar reconciliação");
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
            Importe seu extrato bancário para confirmar pagamentos automaticamente
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchConnections} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
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
                    {connectedBankConfig.name} Configurado
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Importe o extrato para verificar pagamentos
                  </p>
                  {connectedBank[1].last_sync && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Última verificação: {new Date(connectedBank[1].last_sync).toLocaleString('pt-BR')}
                    </p>
                  )}
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
              Informe sua chave PIX e selecione seu banco
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
                  Seus dados são usados apenas para identificar pagamentos recebidos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Bank Statement - Main Feature */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Importar Extrato Bancário
          </CardTitle>
          <CardDescription>
            Faça o download do extrato no seu banco e importe aqui para confirmar pagamentos automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".ofx,.csv,.xls,.xlsx,.txt"
              className="hidden"
              onChange={(e) => {
                setImportFile(e.target.files?.[0] || null);
                setParsedTransactions([]);
                setReconciliationResults(null);
                setShowTransactions(false);
              }}
            />
            
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
              </div>
              
              <div>
                <p className="text-lg font-medium">
                  {importFile ? importFile.name : "Selecione o arquivo de extrato"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Formatos suportados: OFX, CSV, XLS, XLSX
                </p>
              </div>
              
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {importFile ? "Trocar Arquivo" : "Selecionar Arquivo"}
                </Button>
                
                {importFile && !showTransactions && (
                  <Button onClick={handleFileImport} disabled={importing}>
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Ler Extrato
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Parsed Transactions */}
          {showTransactions && parsedTransactions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {parsedTransactions.length} Transações Encontradas
                </h4>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="auto-confirm"
                      checked={autoConfirm}
                      onCheckedChange={(checked) => setAutoConfirm(checked === true)}
                    />
                    <Label htmlFor="auto-confirm" className="text-sm cursor-pointer">
                      Confirmar automaticamente correspondências
                    </Label>
                  </div>
                  <Button onClick={processReconciliation} disabled={importing}>
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Reconciliar Pagamentos
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedTransactions.slice(0, 20).map((t, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">
                          {new Date(t.date).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {t.description}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          R$ {t.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.type === 'credit' ? 'default' : 'secondary'}>
                            {t.type === 'credit' ? 'Entrada' : 'Saída'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedTransactions.length > 20 && (
                  <p className="text-xs text-muted-foreground p-2 text-center">
                    Mostrando 20 de {parsedTransactions.length} transações
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Reconciliation Results */}
          {reconciliationResults && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Resultado da Reconciliação
              </h4>

              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <p className="text-2xl font-bold text-blue-600">{reconciliationResults.transactions_processed}</p>
                  <p className="text-xs text-muted-foreground">Transações</p>
                </div>
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                  <p className="text-2xl font-bold text-yellow-600">{reconciliationResults.orders_checked}</p>
                  <p className="text-xs text-muted-foreground">Pedidos Pendentes</p>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                  <p className="text-2xl font-bold text-purple-600">{reconciliationResults.matched}</p>
                  <p className="text-xs text-muted-foreground">Correspondências</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <p className="text-2xl font-bold text-green-600">{reconciliationResults.confirmed}</p>
                  <p className="text-xs text-muted-foreground">Confirmados</p>
                </div>
              </div>

              {reconciliationResults.results.length > 0 && (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Confiança</TableHead>
                        <TableHead>Transação Correspondente</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconciliationResults.results.map((result, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-sm">{result.order_nsu}</TableCell>
                          <TableCell className="text-right font-mono">
                            R$ {result.order_amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {result.status === 'matched' ? (
                              <Badge className="bg-green-600">
                                <Check className="h-3 w-3 mr-1" />
                                Encontrado
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <X className="h-3 w-3 mr-1" />
                                Não Encontrado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {result.confidence > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${result.confidence >= 80 ? 'bg-green-500' : result.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${result.confidence}%` }}
                                  />
                                </div>
                                <span className="text-xs">{result.confidence}%</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {result.matched_transaction ? (
                              <>
                                {new Date(result.matched_transaction.date).toLocaleDateString('pt-BR')} - 
                                R$ {result.matched_transaction.amount.toFixed(2)}
                              </>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h5 className="font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              Como exportar seu extrato
            </h5>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">1.</span>
                Acesse o app ou site do seu banco
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">2.</span>
                Vá em Extrato {">"} Exportar ou Baixar extrato
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">3.</span>
                Escolha o formato OFX ou CSV (preferencial)
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">4.</span>
                Selecione o período que contém os pagamentos pendentes
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">5.</span>
                Importe o arquivo aqui e clique em "Reconciliar Pagamentos"
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como Funciona a Reconciliação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-medium text-sm">1. Importe</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Exporte o extrato do seu banco e envie aqui
              </p>
            </div>
            <div className="text-center p-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-medium text-sm">2. Analise</h4>
              <p className="text-xs text-muted-foreground mt-1">
                O sistema lê e identifica as transações
              </p>
            </div>
            <div className="text-center p-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-medium text-sm">3. Reconcilie</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Comparamos valores e datas com pedidos pendentes
              </p>
            </div>
            <div className="text-center p-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <h4 className="font-medium text-sm">4. Confirme</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Pagamentos são confirmados automaticamente
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BankConnectionManager;
