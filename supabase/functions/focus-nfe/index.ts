import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmitNFePayload {
  action: "emit" | "consult" | "cancel" | "download_danfe" | "download_xml";
  order_id?: string;
  ref?: string;
  justificativa?: string;
}

interface EmissorInfo {
  cnpj_emitente: string;
  nome_emitente: string;
  nome_fantasia_emitente: string;
  inscricao_estadual_emitente: string;
  logradouro_emitente: string;
  numero_emitente: string;
  complemento_emitente?: string;
  bairro_emitente: string;
  municipio_emitente: string;
  uf_emitente: string;
  cep_emitente: string;
  telefone_emitente?: string;
  regime_tributario?: string;
}

interface ProductFiscalInfo {
  codigo_ncm: string;
  cfop: string;
  icms_origem: string;
  icms_situacao_tributaria: string;
  pis_situacao_tributaria: string;
  cofins_situacao_tributaria: string;
}

async function verifyAdmin(req: Request, supabaseUrl: string, supabaseServiceKey: string): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { isAdmin: false, error: "Token de autenticação não fornecido" };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || supabaseServiceKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
  if (error || !user) {
    return { isAdmin: false, error: "Usuário não autenticado" };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roles) {
    return { isAdmin: false, error: "Acesso não autorizado" };
  }

  return { isAdmin: true, userId: user.id };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FOCUS_NFE_TOKEN = Deno.env.get("FOCUS_NFE_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!FOCUS_NFE_TOKEN) {
      return new Response(
        JSON.stringify({ error: "FOCUS_NFE_TOKEN não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin authentication
    const { isAdmin, error: authError } = await verifyAdmin(req, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: authError }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const payload: EmitNFePayload = await req.json();

    // Determine environment
    const { data: envSettings } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "focus_nfe_environment")
      .maybeSingle();
    
    const isProduction = envSettings?.value?.production === true;
    const baseUrl = isProduction 
      ? "https://api.focusnfe.com.br" 
      : "https://homologacao.focusnfe.com.br";

    console.log(`Using Focus NFe environment: ${isProduction ? "PRODUÇÃO" : "HOMOLOGAÇÃO"}`);

    const authHeader = "Basic " + btoa(FOCUS_NFE_TOKEN + ":");

    // Action: Consult NF-e
    if (payload.action === "consult" && payload.ref) {
      const response = await fetch(`${baseUrl}/v2/nfe/${payload.ref}`, {
        method: "GET",
        headers: { Authorization: authHeader },
      });
      const result = await response.json();
      return new Response(
        JSON.stringify({ success: response.ok, data: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Download DANFE PDF
    if (payload.action === "download_danfe" && payload.ref) {
      const response = await fetch(`${baseUrl}/v2/nfe/${payload.ref}.pdf`, {
        method: "GET",
        headers: { Authorization: authHeader },
      });
      
      if (!response.ok) {
        const error = await response.text();
        return new Response(
          JSON.stringify({ success: false, error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const pdfBuffer = await response.arrayBuffer();
      const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
      
      return new Response(
        JSON.stringify({ success: true, pdf_base64: pdfBase64 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Download XML
    if (payload.action === "download_xml" && payload.ref) {
      const response = await fetch(`${baseUrl}/v2/nfe/${payload.ref}.xml`, {
        method: "GET",
        headers: { Authorization: authHeader },
      });
      
      if (!response.ok) {
        const error = await response.text();
        return new Response(
          JSON.stringify({ success: false, error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const xml = await response.text();
      return new Response(
        JSON.stringify({ success: true, xml }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Cancel NF-e
    if (payload.action === "cancel" && payload.ref) {
      if (!payload.justificativa || payload.justificativa.length < 15) {
        return new Response(
          JSON.stringify({ error: "Justificativa deve ter no mínimo 15 caracteres" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await fetch(`${baseUrl}/v2/nfe/${payload.ref}`, {
        method: "DELETE",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ justificativa: payload.justificativa }),
      });
      const result = await response.json();
      return new Response(
        JSON.stringify({ success: response.ok, data: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Emit NF-e
    if (payload.action === "emit" && payload.order_id) {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", payload.order_id)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ error: "Pedido não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: emissorSettings } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "focus_nfe_emissor")
        .maybeSingle();

      if (!emissorSettings?.value) {
        return new Response(
          JSON.stringify({ error: "Dados do emitente não configurados" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const emissor = emissorSettings.value as EmissorInfo;

      const { data: fiscalSettings } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "focus_nfe_fiscal_defaults")
        .maybeSingle();

      const fiscalDefaults = (fiscalSettings?.value || {
        cfop: "5102",
        codigo_ncm: "09109190",
        icms_origem: "0",
        icms_situacao_tributaria: "102",
        pis_situacao_tributaria: "07",
        cofins_situacao_tributaria: "07",
      }) as ProductFiscalInfo;

      const ref = `order_${order.order_nsu}_${Date.now()}`;

      const orderItems = order.items as Array<{ 
        name: string; 
        quantity: number; 
        price: number;
        product_id?: string;
      }>;

      const items = orderItems.map((item, index) => ({
        numero_item: String(index + 1),
        codigo_produto: item.product_id || String(index + 1),
        descricao: isProduction ? item.name : "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL",
        cfop: fiscalDefaults.cfop,
        unidade_comercial: "UN",
        quantidade_comercial: String(item.quantity),
        valor_unitario_comercial: (item.price / 100).toFixed(4),
        valor_unitario_tributavel: (item.price / 100).toFixed(4),
        unidade_tributavel: "UN",
        codigo_ncm: fiscalDefaults.codigo_ncm,
        quantidade_tributavel: String(item.quantity),
        valor_bruto: ((item.price * item.quantity) / 100).toFixed(2),
        icms_origem: fiscalDefaults.icms_origem,
        icms_situacao_tributaria: fiscalDefaults.icms_situacao_tributaria,
        pis_situacao_tributaria: fiscalDefaults.pis_situacao_tributaria,
        cofins_situacao_tributaria: fiscalDefaults.cofins_situacao_tributaria,
        inclui_no_total: "1",
      }));

      const destinatarioDoc = order.customer_phone?.replace(/\D/g, "") || "";
      const isCnpj = destinatarioDoc.length === 14;

      const nfePayload: Record<string, unknown> = {
        natureza_operacao: "Venda de mercadoria",
        data_emissao: new Date().toISOString(),
        tipo_documento: "1",
        finalidade_emissao: "1",
        consumidor_final: "1",
        presenca_comprador: "2",
        
        cnpj_emitente: emissor.cnpj_emitente,
        nome_emitente: emissor.nome_emitente,
        nome_fantasia_emitente: emissor.nome_fantasia_emitente,
        inscricao_estadual_emitente: emissor.inscricao_estadual_emitente,
        logradouro_emitente: emissor.logradouro_emitente,
        numero_emitente: emissor.numero_emitente,
        bairro_emitente: emissor.bairro_emitente,
        municipio_emitente: emissor.municipio_emitente,
        uf_emitente: emissor.uf_emitente,
        cep_emitente: emissor.cep_emitente,
        regime_tributario_emitente: emissor.regime_tributario || "1",

        nome_destinatario: isProduction 
          ? (order.customer_name || "Consumidor") 
          : "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL",
        indicador_inscricao_estadual_destinatario: "9",
        
        valor_produtos: (order.total_amount / 100).toFixed(2),
        valor_total: (order.total_amount / 100).toFixed(2),
        modalidade_frete: "9",

        items,
      };

      if (isCnpj) {
        nfePayload.cnpj_destinatario = destinatarioDoc;
      } else if (destinatarioDoc.length === 11) {
        nfePayload.cpf_destinatario = destinatarioDoc;
      }

      console.log("Sending NF-e to Focus:", JSON.stringify(nfePayload, null, 2));

      const response = await fetch(`${baseUrl}/v2/nfe?ref=${ref}`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nfePayload),
      });

      const result = await response.json();
      console.log("Focus NFe response:", result);

      if (!response.ok) {
        return new Response(
          JSON.stringify({ success: false, error: result }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("orders")
        .update({ invoice_slug: ref })
        .eq("id", order.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          ref,
          data: result,
          message: "NF-e enviada para processamento" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in focus-nfe:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
