import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_ADMIN_PHONE = "5511919778073";

interface OrderAlertPayload {
  order_nsu: string;
  customer_name?: string;
  customer_phone?: string;
  total_amount: number;
  payment_method?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZAPI_INSTANCE_ID = (Deno.env.get("ZAPI_INSTANCE_ID") || "").trim();
    const ZAPI_TOKEN = (Deno.env.get("ZAPI_TOKEN") || "").trim();
    const ZAPI_CLIENT_TOKEN = (Deno.env.get("ZAPI_CLIENT_TOKEN") || "").trim();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
      console.error("Z-API credentials not configured");
      return new Response(
        JSON.stringify({ error: "Z-API credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Using Z-API Instance:", ZAPI_INSTANCE_ID);
    console.log("Z-API token length:", ZAPI_TOKEN.length);
    console.log("Z-API client-token present:", Boolean(ZAPI_CLIENT_TOKEN), "len:", ZAPI_CLIENT_TOKEN.length);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get admin phone from store_settings
    const { data: phoneSettings } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "whatsapp_alert_phone")
      .maybeSingle();

    const adminPhone = phoneSettings?.value?.phone || DEFAULT_ADMIN_PHONE;
    console.log("Using admin phone:", adminPhone);

    const payload: OrderAlertPayload = await req.json();
    console.log("Order alert payload:", payload);

    // Format items list
    const itemsList = payload.items
      .map((item) => `  • ${item.quantity}x ${item.name} - R$ ${(item.price / 100).toFixed(2)}`)
      .join("\n");

    // Format total amount (converting from cents)
    const totalFormatted = (payload.total_amount / 100).toFixed(2);

    // Build WhatsApp message with different formatting for PIX vs Card
    const isPix = payload.payment_method === "pix";
    
    const message = isPix 
      ? `🔔 *NOVO PEDIDO PIX - AÇÃO NECESSÁRIA!*

📋 *NSU:* ${payload.order_nsu}
👤 *Cliente:* ${payload.customer_name || "Não informado"}
📱 *Telefone:* ${payload.customer_phone || "Não informado"}
💳 *Pagamento:* PIX (Estático)

*Itens:*
${itemsList}

💰 *Total:* R$ ${totalFormatted}

⚠️ *IMPORTANTE:* Este pedido requer confirmação manual!
📱 Acesse o painel admin e confirme após verificar o pagamento no seu extrato bancário.`
      : `🛒 *NOVO PEDIDO RECEBIDO!*

📋 *NSU:* ${payload.order_nsu}
👤 *Cliente:* ${payload.customer_name || "Não informado"}
📱 *Telefone:* ${payload.customer_phone || "Não informado"}
💳 *Pagamento:* ${payload.payment_method === "credit_card" ? "Cartão de Crédito" : payload.payment_method || "Pendente"}

*Itens:*
${itemsList}

💰 *Total:* R$ ${totalFormatted}

⏳ Aguardando confirmação de pagamento.`;

    // Send WhatsApp message via Z-API
    const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (ZAPI_CLIENT_TOKEN) {
      headers["Client-Token"] = ZAPI_CLIENT_TOKEN;
    }

    const whatsappResponse = await fetch(zapiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        phone: adminPhone,
        message: message,
      }),
    });

    const whatsappResult = await whatsappResponse.json();
    console.log("Z-API response:", whatsappResult);

    // Log the WhatsApp message
    const logPayload = {
      order_nsu: payload.order_nsu,
      customer_name: payload.customer_name,
      payment_method: payload.payment_method,
      total_amount: payload.total_amount,
      items_count: payload.items.length,
    };

    if (whatsappResponse.ok) {
      await supabase.from("whatsapp_logs").insert({
        message_type: "order_alert",
        destination_phone: adminPhone,
        message_id: whatsappResult.messageId || null,
        zaap_id: whatsappResult.zaapId || null,
        status: "sent",
        payload: logPayload,
      });
    } else {
      await supabase.from("whatsapp_logs").insert({
        message_type: "order_alert",
        destination_phone: adminPhone,
        message_id: null,
        zaap_id: null,
        status: "failed",
        error_message: JSON.stringify(whatsappResult),
        payload: logPayload,
      });

      console.error("Z-API error:", whatsappResult);
      return new Response(
        JSON.stringify({ error: "Failed to send WhatsApp message", details: whatsappResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Order alert sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in order-alert-whatsapp:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
