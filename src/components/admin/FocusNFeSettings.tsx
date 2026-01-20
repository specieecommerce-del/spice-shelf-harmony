import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Save, Loader2, FileText, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EmissorInfo {
  cnpj_emitente: string;
  nome_emitente: string;
  nome_fantasia_emitente: string;
  inscricao_estadual_emitente: string;
  logradouro_emitente: string;
  numero_emitente: string;
  complemento_emitente: string;
  bairro_emitente: string;
  municipio_emitente: string;
  uf_emitente: string;
  cep_emitente: string;
  telefone_emitente: string;
  regime_tributario: string;
}

interface FiscalDefaults {
  cfop: string;
  codigo_ncm: string;
  icms_origem: string;
  icms_situacao_tributaria: string;
  pis_situacao_tributaria: string;
  cofins_situacao_tributaria: string;
}

const FocusNFeSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isProduction, setIsProduction] = useState(false);
  
  const [emissor, setEmissor] = useState<EmissorInfo>({
    cnpj_emitente: "",
    nome_emitente: "",
    nome_fantasia_emitente: "",
    inscricao_estadual_emitente: "",
    logradouro_emitente: "",
    numero_emitente: "",
    complemento_emitente: "",
    bairro_emitente: "",
    municipio_emitente: "",
    uf_emitente: "",
    cep_emitente: "",
    telefone_emitente: "",
    regime_tributario: "1",
  });

  const [fiscal, setFiscal] = useState<FiscalDefaults>({
    cfop: "5102",
    codigo_ncm: "09109190",
    icms_origem: "0",
    icms_situacao_tributaria: "102",
    pis_situacao_tributaria: "07",
    cofins_situacao_tributaria: "07",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);

      // Load emissor
      const { data: emissorData } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "focus_nfe_emissor")
        .maybeSingle();

      if (emissorData?.value) {
        setEmissor(emissorData.value as unknown as EmissorInfo);
      }

      // Load fiscal defaults
      const { data: fiscalData } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "focus_nfe_fiscal_defaults")
        .maybeSingle();

      if (fiscalData?.value) {
        setFiscal(fiscalData.value as unknown as FiscalDefaults);
      }

      // Load environment
      const { data: envData } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "focus_nfe_environment")
        .maybeSingle();

      if (envData?.value) {
        setIsProduction((envData.value as { production: boolean }).production);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!emissor.cnpj_emitente || !emissor.nome_emitente || !emissor.inscricao_estadual_emitente) {
      toast.error("Preencha os campos obrigatórios: CNPJ, Razão Social e IE");
      return;
    }

    try {
      setIsSaving(true);

      // Save emissor
      const emissorJson = JSON.parse(JSON.stringify(emissor));
      await supabase
        .from("store_settings")
        .upsert([{
          key: "focus_nfe_emissor",
          value: emissorJson,
        }], { onConflict: "key" });

      // Save fiscal defaults
      const fiscalJson = JSON.parse(JSON.stringify(fiscal));
      await supabase
        .from("store_settings")
        .upsert([{
          key: "focus_nfe_fiscal_defaults",
          value: fiscalJson,
        }], { onConflict: "key" });

      // Save environment
      await supabase
        .from("store_settings")
        .upsert([{
          key: "focus_nfe_environment",
          value: { production: isProduction },
        }], { onConflict: "key" });

      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  };

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Configurações NF-e (Focus NFe)
        </h2>
        <p className="text-muted-foreground mt-1">
          Configure os dados do emitente e padrões fiscais para emissão de NF-e
        </p>
      </div>

      {/* Environment Switch */}
      <Card className={isProduction ? "border-green-500/50 bg-green-50/50" : "border-orange-500/50 bg-orange-50/50"}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{isProduction ? "🟢 Ambiente de Produção" : "🟠 Ambiente de Homologação"}</p>
              <p className="text-sm text-muted-foreground">
                {isProduction 
                  ? "As NF-e emitidas terão validade fiscal"
                  : "Ambiente de testes - NF-e sem valor fiscal"}
              </p>
            </div>
            <Switch
              checked={isProduction}
              onCheckedChange={setIsProduction}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="emissor">
        <TabsList>
          <TabsTrigger value="emissor" className="gap-2">
            <Building2 className="h-4 w-4" />
            Dados do Emitente
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Padrões Fiscais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emissor" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Empresa Emitente</CardTitle>
              <CardDescription>
                Informações que aparecerão na NF-e como emitente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CNPJ *</Label>
                  <Input
                    value={formatCnpj(emissor.cnpj_emitente)}
                    onChange={(e) => setEmissor({ ...emissor, cnpj_emitente: e.target.value.replace(/\D/g, "") })}
                    placeholder="00.000.000/0001-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Inscrição Estadual *</Label>
                  <Input
                    value={emissor.inscricao_estadual_emitente}
                    onChange={(e) => setEmissor({ ...emissor, inscricao_estadual_emitente: e.target.value })}
                    placeholder="000000000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Razão Social *</Label>
                  <Input
                    value={emissor.nome_emitente}
                    onChange={(e) => setEmissor({ ...emissor, nome_emitente: e.target.value })}
                    placeholder="Nome empresarial completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome Fantasia</Label>
                  <Input
                    value={emissor.nome_fantasia_emitente}
                    onChange={(e) => setEmissor({ ...emissor, nome_fantasia_emitente: e.target.value })}
                    placeholder="Nome comercial"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Logradouro</Label>
                  <Input
                    value={emissor.logradouro_emitente}
                    onChange={(e) => setEmissor({ ...emissor, logradouro_emitente: e.target.value })}
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input
                    value={emissor.numero_emitente}
                    onChange={(e) => setEmissor({ ...emissor, numero_emitente: e.target.value })}
                    placeholder="123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input
                    value={emissor.complemento_emitente}
                    onChange={(e) => setEmissor({ ...emissor, complemento_emitente: e.target.value })}
                    placeholder="Sala, Bloco, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input
                    value={emissor.bairro_emitente}
                    onChange={(e) => setEmissor({ ...emissor, bairro_emitente: e.target.value })}
                    placeholder="Nome do bairro"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Município</Label>
                  <Input
                    value={emissor.municipio_emitente}
                    onChange={(e) => setEmissor({ ...emissor, municipio_emitente: e.target.value })}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Select
                    value={emissor.uf_emitente}
                    onValueChange={(v) => setEmissor({ ...emissor, uf_emitente: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input
                    value={formatCep(emissor.cep_emitente)}
                    onChange={(e) => setEmissor({ ...emissor, cep_emitente: e.target.value.replace(/\D/g, "") })}
                    placeholder="00000-000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={emissor.telefone_emitente}
                    onChange={(e) => setEmissor({ ...emissor, telefone_emitente: e.target.value.replace(/\D/g, "") })}
                    placeholder="11999999999"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Regime Tributário</Label>
                  <Select
                    value={emissor.regime_tributario}
                    onValueChange={(v) => setEmissor({ ...emissor, regime_tributario: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Simples Nacional</SelectItem>
                      <SelectItem value="2">Simples Nacional - Excesso</SelectItem>
                      <SelectItem value="3">Regime Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Padrões Fiscais dos Produtos</CardTitle>
              <CardDescription>
                Valores padrão para produtos sem configuração fiscal específica
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CFOP (Código Fiscal)</Label>
                  <Input
                    value={fiscal.cfop}
                    onChange={(e) => setFiscal({ ...fiscal, cfop: e.target.value })}
                    placeholder="5102"
                  />
                  <p className="text-xs text-muted-foreground">Ex: 5102 = Venda de mercadoria dentro do estado</p>
                </div>
                <div className="space-y-2">
                  <Label>NCM (Classificação Mercadoria)</Label>
                  <Input
                    value={fiscal.codigo_ncm}
                    onChange={(e) => setFiscal({ ...fiscal, codigo_ncm: e.target.value })}
                    placeholder="09109190"
                  />
                  <p className="text-xs text-muted-foreground">8 dígitos - Ex: 09109190 = Especiarias</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Origem ICMS</Label>
                  <Select
                    value={fiscal.icms_origem}
                    onValueChange={(v) => setFiscal({ ...fiscal, icms_origem: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 - Nacional</SelectItem>
                      <SelectItem value="1">1 - Estrangeira (importação direta)</SelectItem>
                      <SelectItem value="2">2 - Estrangeira (mercado interno)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>CST ICMS (Simples Nacional)</Label>
                  <Select
                    value={fiscal.icms_situacao_tributaria}
                    onValueChange={(v) => setFiscal({ ...fiscal, icms_situacao_tributaria: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="101">101 - Tributada com permissão de crédito</SelectItem>
                      <SelectItem value="102">102 - Tributada sem permissão de crédito</SelectItem>
                      <SelectItem value="103">103 - Isenção para faixa de receita</SelectItem>
                      <SelectItem value="300">300 - Imune</SelectItem>
                      <SelectItem value="400">400 - Não tributada</SelectItem>
                      <SelectItem value="500">500 - ICMS cobrado anteriormente por ST</SelectItem>
                      <SelectItem value="900">900 - Outras</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CST PIS</Label>
                  <Select
                    value={fiscal.pis_situacao_tributaria}
                    onValueChange={(v) => setFiscal({ ...fiscal, pis_situacao_tributaria: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="01">01 - Operação tributável</SelectItem>
                      <SelectItem value="04">04 - Tributação monofásica (alíquota zero)</SelectItem>
                      <SelectItem value="06">06 - Operação tributável (alíquota zero)</SelectItem>
                      <SelectItem value="07">07 - Operação isenta</SelectItem>
                      <SelectItem value="08">08 - Sem incidência</SelectItem>
                      <SelectItem value="09">09 - Com suspensão</SelectItem>
                      <SelectItem value="49">49 - Outras saídas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>CST COFINS</Label>
                  <Select
                    value={fiscal.cofins_situacao_tributaria}
                    onValueChange={(v) => setFiscal({ ...fiscal, cofins_situacao_tributaria: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="01">01 - Operação tributável</SelectItem>
                      <SelectItem value="04">04 - Tributação monofásica (alíquota zero)</SelectItem>
                      <SelectItem value="06">06 - Operação tributável (alíquota zero)</SelectItem>
                      <SelectItem value="07">07 - Operação isenta</SelectItem>
                      <SelectItem value="08">08 - Sem incidência</SelectItem>
                      <SelectItem value="09">09 - Com suspensão</SelectItem>
                      <SelectItem value="49">49 - Outras saídas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button onClick={saveSettings} disabled={isSaving} className="gap-2">
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar Configurações
      </Button>
    </div>
  );
};

export default FocusNFeSettings;
