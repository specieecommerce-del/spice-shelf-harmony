import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept, prefer, x-hook-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional: simple token verification via query param
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || "";
    const { data: settingsRow } = await supabase.from("store_settings").select("value").eq("key", "boleto_settings").maybeSingle();
    const v = (settingsRow?.value ?? null) as Record<string, unknown> | null;
    const registered = (v?.["registered"] ?? {}) as Record<string, unknown>;
    const webhookSecret = String(registered?.["webhook_secret"] || "").trim();
    if (webhookSecret && token !== webhookSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized webhook" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = String(payload?.event || "").toUpperCase();
    const payment = payload?.payment || {};
    const status = String(payment?.status || "").toUpperCase();
    const externalRef = String(payment?.externalReference || "");

    let newStatus = "";
    if (status === "RECEIVED" || status === "CONFIRMED") newStatus = "paid";
    else if (status === "OVERDUE") newStatus = "overdue";
    else if (status === "CANCELED" || status === "CANCELLED") newStatus = "cancelled";

    if (newStatus && externalRef) {
      await supabase
        .from("orders")
        .update({ status: newStatus, confirmation_source: "asaas_webhook" })
        .eq("order_nsu", externalRef);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
