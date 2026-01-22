import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  category: string;
}

interface CustomerData {
  name: string;
  email: string;
  phone: string;
}

interface RequestBody {
  items: CartItem[];
  customer: CustomerData;
  redirectUrl: string;
  action?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    
    // Check config action
    if (body.action === "check_config") {
      const email = Deno.env.get("PAGSEGURO_EMAIL");
      const token = Deno.env.get("PAGSEGURO_TOKEN");
      
      const configured = !!(email && token);
      console.log("PagSeguro config check:", { configured, hasEmail: !!email, hasToken: !!token });
      
      return new Response(
        JSON.stringify({ configured }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pagSeguroEmail = Deno.env.get("PAGSEGURO_EMAIL");
    const pagSeguroToken = Deno.env.get("PAGSEGURO_TOKEN");

    if (!pagSeguroEmail || !pagSeguroToken) {
      console.error("PagSeguro credentials not configured");
      return new Response(
        JSON.stringify({ error: "PagSeguro não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { items, customer, redirectUrl } = body;

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Carrinho vazio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate total
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalAmountCents = Math.round(totalAmount * 100);

    // Generate order NSU
    const orderNsu = `PS_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    console.log("Creating PagSeguro payment:", { orderNsu, totalAmount, itemCount: items.length });

    // Build PagSeguro checkout request
    // Using PagSeguro Checkout Transparente API v4
    const pagSeguroItems = items.map((item, index) => ({
      reference_id: `item_${index + 1}`,
      name: item.name.substring(0, 100),
      quantity: item.quantity,
      unit_amount: Math.round(item.price * 100),
    }));

    const checkoutPayload = {
      reference_id: orderNsu,
      customer: {
        name: customer.name,
        email: customer.email,
        tax_id: "", // CPF - optional for checkout link
        phones: [
          {
            country: "55",
            area: customer.phone.replace(/\D/g, "").substring(0, 2),
            number: customer.phone.replace(/\D/g, "").substring(2),
            type: "MOBILE",
          },
        ],
      },
      items: pagSeguroItems,
      notification_urls: [
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/pagseguro-webhook`,
      ],
      redirect_url: redirectUrl,
      payment_methods: [
        { type: "CREDIT_CARD" },
        { type: "DEBIT_CARD" },
      ],
      payment_methods_configs: [
        {
          type: "CREDIT_CARD",
          config_options: [
            { option: "INSTALLMENTS_LIMIT", value: "12" },
          ],
        },
      ],
    };

    console.log("PagSeguro payload:", JSON.stringify(checkoutPayload, null, 2));

    // Call PagSeguro API - Using sandbox for testing, production for live
    const isProd = true; // Set to false for sandbox testing
    const apiUrl = isProd 
      ? "https://api.pagseguro.com/checkouts"
      : "https://sandbox.api.pagseguro.com/checkouts";

    const pagSeguroResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${pagSeguroToken}`,
        "x-api-version": "4.0",
      },
      body: JSON.stringify(checkoutPayload),
    });

    const responseText = await pagSeguroResponse.text();
    console.log("PagSeguro response status:", pagSeguroResponse.status);
    console.log("PagSeguro response:", responseText);

    let pagSeguroData;
    try {
      pagSeguroData = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse PagSeguro response");
      return new Response(
        JSON.stringify({ error: "Erro ao processar resposta do PagSeguro" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pagSeguroResponse.ok) {
      console.error("PagSeguro API error:", pagSeguroData);
      const errorMessage = pagSeguroData.error_messages?.[0]?.description || 
                          pagSeguroData.message || 
                          "Erro ao criar pagamento";
      return new Response(
        JSON.stringify({ error: errorMessage, details: pagSeguroData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get payment link from response
    const paymentLink = pagSeguroData.links?.find((l: { rel: string }) => l.rel === "PAY")?.href;

    if (!paymentLink) {
      console.error("No payment link in PagSeguro response:", pagSeguroData);
      return new Response(
        JSON.stringify({ error: "Link de pagamento não retornado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save order to database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        order_nsu: orderNsu,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        items: items,
        total_amount: totalAmountCents,
        status: "pending",
        payment_link: paymentLink,
        payment_method: "credit_card",
      });

    if (orderError) {
      console.error("Error saving order:", orderError);
      // Continue even if order save fails - payment link is still valid
    } else {
      console.log("Order saved successfully:", orderNsu);

      // Send WhatsApp alert
      try {
        const alertPayload = {
          order_nsu: orderNsu,
          customer_name: customer.name,
          customer_phone: customer.phone,
          total_amount: totalAmountCents,
          payment_method: "credit_card",
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: Math.round(item.price * 100),
          })),
        };

        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/order-alert-whatsapp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(alertPayload),
        }).catch(err => console.error("WhatsApp alert failed:", err));
      } catch (alertError) {
        console.error("Error sending WhatsApp alert:", alertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentUrl: paymentLink,
        orderNsu: orderNsu,
        checkoutId: pagSeguroData.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    console.error("Error in create-pagseguro-payment:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
