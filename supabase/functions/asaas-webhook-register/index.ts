/// <reference path="../deno-shims.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept, prefer",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ASAAS_WEBHOOK_TOKEN = (Deno.env.get("ASAAS_WEBHOOK_TOKEN") || "").trim();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webhookUrl = String(body["url"] || "").trim();
    const email = String(body["email"] || "").trim();
    const sendType = String(body["sendType"] || "SEQUENTIALLY").trim();
    const name = String(body["name"] || "BOLETO SPECIES ALIMENTOS").trim();
    const envFromBody = String(body["environment"] || "").trim().toLowerCase();
    const isProd = envFromBody === "production";
    const ASAAS_API_KEY = (isProd ? Deno.env.get("ASAAS_API_KEY_PROD") : Deno.env.get("ASAAS_API_KEY_SANDBOX")) || Deno.env.get("ASAAS_ACCESS_TOKEN") || "";

    if (!ASAAS_API_KEY || ASAAS_API_KEY.trim() === "") {
      return new Response(JSON.stringify({ error: "ASAAS_ACCESS_TOKEN não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ASAAS_WEBHOOK_TOKEN) {
      return new Response(JSON.stringify({ error: "ASAAS_WEBHOOK_TOKEN não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: "url do webhook é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = isProd ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";

    const finalUrl = webhookUrl.includes("token=")
      ? webhookUrl
      : (webhookUrl.includes("?")
        ? `${webhookUrl}&token=${ASAAS_WEBHOOK_TOKEN}`
        : `${webhookUrl}?token=${ASAAS_WEBHOOK_TOKEN}`);

    const headers = {
      "Content-Type": "application/json",
      "accept": "application/json",
      "User-Agent": "speciesalimentos.com.br",
      "access_token": ASAAS_API_KEY.trim(),
    };

    const events = [
      "PAYMENT_CREATED",
      "PAYMENT_UPDATED",
      "PAYMENT_CONFIRMED",
      "PAYMENT_RECEIVED",
      "PAYMENT_OVERDUE",
      "PAYMENT_DELETED",
      "PAYMENT_RESTORED",
      "PAYMENT_REFUNDED",
      "PAYMENT_RECEIVED_IN_CASH_UNDONE",
      "PAYMENT_CHARGEBACK_REQUESTED",
      "PAYMENT_CHARGEBACK_DISPUTE",
      "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
      "PAYMENT_DUNNING_RECEIVED",
      "PAYMENT_DUNNING_REQUESTED",
    ];

    // 1. List existing webhooks to check for duplicates
    const listRes = await fetch(`${baseUrl}/webhooks`, { method: "GET", headers });
    const listJson = await listRes.json();
    const existingWebhooks = listJson?.data || [];

    // Check if a webhook with similar URL already exists
    const existing = existingWebhooks.find((wh: Record<string, unknown>) => {
      const whUrl = String(wh.url || "");
      const baseWebhookUrl = webhookUrl.split("?")[0];
      return whUrl.startsWith(baseWebhookUrl);
    });

    if (existing) {
      // 2. Update existing webhook instead of creating a new one
      const updatePayload = {
        url: finalUrl,
        email: email || undefined,
        sendType,
        name,
        enabled: true,
        interrupted: false,
        events,
      };

      const updateRes = await fetch(`${baseUrl}/webhooks/${existing.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updatePayload),
      });
      const updateJson = await updateRes.json();

      return new Response(JSON.stringify({ success: updateRes.ok, data: updateJson, action: "updated" }), {
        status: updateRes.ok ? 200 : updateRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Create new webhook
    const payload = {
      url: finalUrl,
      email: email || undefined,
      sendType,
      name,
      enabled: true,
      interrupted: false,
      events,
    };

    const res = await fetch(`${baseUrl}/webhooks`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    return new Response(JSON.stringify({ success: res.ok, data: json, action: "created" }), {
      status: res.ok ? 200 : res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("asaas-webhook-register error:", error);
    return new Response(JSON.stringify({ error: "Erro inesperado", detail: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
