import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_PHONE = "5511919778073";

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
    const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
    const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN");

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
      console.error("Z-API credentials not configured");
      return new Response(
        JSON.stringify({ error: "Z-API credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: OrderAlertPayload = await req.json();
    console.log("Order alert payload:", payload);

    // Format items list
    const itemsList = payload.items
      .map((item) => `  • ${item.quantity}x ${item.name} - R$ ${(item.price / 100).toFixed(2)}`)
      .join("\n");

    // Format total amount (converting from cents)
    const totalFormatted = (payload.total_amount / 100).toFixed(2);

    // Build WhatsApp message
    const message = `🛒 *NOVO PEDIDO RECEBIDO!*

📋 *NSU:* ${payload.order_nsu}
👤 *Cliente:* ${payload.customer_name || "Não informado"}
📱 *Telefone:* ${payload.customer_phone || "Não informado"}
💳 *Pagamento:* ${payload.payment_method === "pix" ? "PIX" : payload.payment_method === "credit_card" ? "Cartão de Crédito" : payload.payment_method || "Pendente"}

*Itens:*
${itemsList}

💰 *Total:* R$ ${totalFormatted}

⏳ Aguardando confirmação de pagamento.`;

    // Send WhatsApp message via Z-API
    const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

    const whatsappResponse = await fetch(zapiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: ADMIN_PHONE,
        message: message,
      }),
    });

    const whatsappResult = await whatsappResponse.json();
    console.log("Z-API response:", whatsappResult);

    if (!whatsappResponse.ok) {
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
