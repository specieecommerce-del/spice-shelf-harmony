import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_ADMIN_PHONE = "5511919778073";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
    const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
      console.error("Z-API credentials not configured");
      return new Response(
        JSON.stringify({ error: "Z-API credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Parse request body to check for mode
    let body: { mode?: string; productId?: string; productName?: string; stockQuantity?: number } = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is fine for scheduled runs
    }

    // Get admin phone from store_settings
    const { data: phoneSettings } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "whatsapp_alert_phone")
      .maybeSingle();

    const adminPhone = phoneSettings?.value?.phone || DEFAULT_ADMIN_PHONE;
    console.log("Using admin phone:", adminPhone);

    // Check for pending notifications (triggered by database trigger)
    const { data: pendingNotifications } = await supabase
      .from("stock_notifications")
      .select("*")
      .eq("notified", false)
      .order("created_at", { ascending: true });

    let productsToAlert: Array<{ name: string; stock_quantity: number; low_stock_threshold: number }> = [];

    if (pendingNotifications && pendingNotifications.length > 0) {
      // Process pending notifications from trigger
      productsToAlert = pendingNotifications.map(n => ({
        name: n.product_name,
        stock_quantity: n.stock_quantity,
        low_stock_threshold: n.threshold,
      }));

      // Mark notifications as processed
      const notificationIds = pendingNotifications.map(n => n.id);
      await supabase
        .from("stock_notifications")
        .update({ notified: true })
        .in("id", notificationIds);

      console.log(`Processing ${pendingNotifications.length} pending notifications`);
    } else {
      // Fallback: Check all products with low stock (for manual/scheduled runs)
      const { data: lowStockProducts, error: queryError } = await supabase
        .from("products")
        .select("id, name, stock_quantity, low_stock_threshold")
        .eq("is_active", true);

      if (queryError) {
        console.error("Error querying products:", queryError);
        return new Response(
          JSON.stringify({ error: "Failed to query products" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Filter products where stock is actually <= threshold
      productsToAlert = lowStockProducts?.filter(
        (p) => p.stock_quantity <= p.low_stock_threshold
      ) || [];
    }

    if (productsToAlert.length === 0) {
      console.log("No low stock products found");
      return new Response(
        JSON.stringify({ message: "No low stock alerts needed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build WhatsApp message
    const productList = productsToAlert
      .map((p) => `• ${p.name}: ${p.stock_quantity} unidades (mínimo: ${p.low_stock_threshold})`)
      .join("\n");

    const isImmediate = pendingNotifications && pendingNotifications.length > 0;
    const alertType = isImmediate ? "⚡ ALERTA IMEDIATO" : "🔔 VERIFICAÇÃO PROGRAMADA";

    const message = `🚨 *ALERTA DE ESTOQUE BAIXO*\n${alertType}\n\nOs seguintes produtos estão com estoque abaixo do limite:\n\n${productList}\n\n⚠️ Reponha o estoque o mais rápido possível!`;

    // Send WhatsApp message via Z-API
    const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

    const whatsappResponse = await fetch(zapiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: adminPhone,
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
      JSON.stringify({ 
        success: true, 
        message: `Alert sent for ${productsToAlert.length} products`,
        products: productsToAlert.map(p => p.name),
        immediate: isImmediate
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in stock-alert-whatsapp:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
