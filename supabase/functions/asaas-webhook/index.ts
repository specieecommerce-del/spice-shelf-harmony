/// <reference path="../deno-shims.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept, prefer, x-webhook-token",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Token verification using header or querystring and env
    const url = new URL(req.url);
    const token = req.headers.get("x-webhook-token") || url.searchParams.get("token") || "";
    const expected = Deno.env.get("ASAAS_WEBHOOK_TOKEN") || "";
    if (!expected || token !== expected) {
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
      const update: Record<string, unknown> = { status: newStatus, confirmation_source: "asaas_webhook" };
      if (newStatus === "paid") update["paid_at"] = new Date().toISOString();
      await supabase.from("orders").update(update).eq("order_nsu", externalRef);
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
