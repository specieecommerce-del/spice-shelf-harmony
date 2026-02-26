/// <reference path="../deno-shims.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept, prefer",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ASAAS_ACCESS_TOKEN = (Deno.env.get("ASAAS_ACCESS_TOKEN") || "").trim();
    const ASAAS_WEBHOOK_TOKEN = (Deno.env.get("ASAAS_WEBHOOK_TOKEN") || "").trim();
    const ASAAS_ENV = (Deno.env.get("ASAAS_ENV") || "sandbox").trim().toLowerCase();

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
    const name = String(body["name"] || "BOLETO SPECIES ALIMENTOS").trim();

    if (!ASAAS_ACCESS_TOKEN) {
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

    const baseUrl = ASAAS_ENV === "production"
      ? "https://api.asaas.com/api/v3"
      : "https://sandbox.asaas.com/api/v3";

    const finalUrl = webhookUrl.includes("token=")
      ? webhookUrl
      : (webhookUrl.includes("?")
        ? `${webhookUrl}&token=${ASAAS_WEBHOOK_TOKEN}`
        : `${webhookUrl}?token=${ASAAS_WEBHOOK_TOKEN}`);

    const payload: Record<string, unknown> = { url: finalUrl, authToken: ASAAS_WEBHOOK_TOKEN, name };

    const headers = {
      "Content-Type": "application/json",
      "accept": "application/json",
      "access_token": ASAAS_ACCESS_TOKEN,
    };

    // Prefer GET first: if exists, do nothing; else create minimal
    const listRes = await fetch(`${baseUrl}/webhooks`, { method: "GET", headers });
    const listJson = await listRes.json();
    const existing = Array.isArray(listJson?.data) ? listJson.data.find((w: any) => w?.url === finalUrl || w?.name === name) : null;
    if (existing?.id) {
      return new Response(JSON.stringify({ success: true, data: existing }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const createRes = await fetch(`${baseUrl}/webhooks`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const createJson = await createRes.json();
    return new Response(JSON.stringify({ success: createRes.ok, data: createJson }), {
      status: createRes.ok ? 200 : createRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
