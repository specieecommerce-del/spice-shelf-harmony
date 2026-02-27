/// <reference path="../deno-shims.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept, prefer, x-webhook-token",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: { ...corsHeaders, "Access-Control-Allow-Methods": "POST, GET, OPTIONS" } });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const token = (url.searchParams.get("token") || "").trim();
    const expected = (Deno.env.get("CHECKOUT_TOKEN") || "").trim();
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
    const asaasId = String(payment?.id || "");
    const valueNum = payment?.value ? Number(payment.value) : null;
    const amountCents = valueNum && !Number.isNaN(valueNum) ? Math.round(valueNum * 100) : null;

    const isPaidEvent = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]).has(event);
    const isPaidStatus = status === "RECEIVED" || status === "CONFIRMED";
    const isOverdueStatus = status === "OVERDUE";
    const isCancelledStatus = status === "CANCELED" || status === "CANCELLED";

    if (isPaidEvent || isPaidStatus) {
      // Find payment title by provider id
      const { data: title } = await supabase
        .from("payment_titles")
        .select("id, order_id")
        .eq("provider", "asaas")
        .eq("provider_title_id", asaasId)
        .maybeSingle();

      let orderId = title?.order_id ?? null;
      if (!orderId && externalRef) {
        const { data: order } = await supabase
          .from("orders")
          .select("id")
          .eq("order_nsu", externalRef)
          .maybeSingle();
        orderId = order?.id ?? null;
      }

      if (!orderId) {
        return new Response(JSON.stringify({ ok: true, ignored: true, reason: "order_not_found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const paidAt = new Date().toISOString();
      const orderUpdate: Record<string, unknown> = { status: "paid", paid_at: paidAt, confirmation_source: "asaas_webhook" };
      if (amountCents) orderUpdate["paid_amount"] = amountCents;
      await supabase.from("orders").update(orderUpdate).eq("id", orderId);

      if (title?.id) {
        const titleUpdate: Record<string, unknown> = { status: "paid", paid_at: paidAt };
        if (amountCents) titleUpdate["paid_amount_cents"] = amountCents;
        await supabase.from("payment_titles").update(titleUpdate).eq("id", title.id);
      }
    } else if (isOverdueStatus && externalRef) {
      await supabase.from("orders").update({ status: "overdue", confirmation_source: "asaas_webhook" }).eq("order_nsu", externalRef);
    } else if (isCancelledStatus && externalRef) {
      await supabase.from("orders").update({ status: "cancelled", confirmation_source: "asaas_webhook" }).eq("order_nsu", externalRef);
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
