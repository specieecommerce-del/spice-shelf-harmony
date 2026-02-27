/// <reference path="../deno-shims.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface Payload {
  payerDocument: string;
  value: number;
  dueDate: string;
  payerName?: string;
  description?: string;
  email: string;
  phone?: string;
}

function isDigits(s: string) {
  return /^\d+$/.test(s);
}
function validateDateFormat(d: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}
function isValidCalendarDate(d: string) {
  const [y, m, day] = d.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !day) return false;
  const dt = new Date(Date.UTC(y, m - 1, day));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === day;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST is allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date().toISOString();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ errors: ["Invalid JSON payload"] }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload: Payload = body;
  const errors: string[] = [];

  const doc = String(payload.payerDocument || "").replace(/\D/g, "");
  const phone = String(payload.phone || "").replace(/\D/g, "");
  const email = String(payload.email || "").trim();
  const name = String(payload.payerName || "").trim() || "Cliente";

  if (!doc) errors.push("payerDocument is required.");
  else if (!isDigits(doc)) errors.push("payerDocument must contain only digits.");
  else if (!(doc.length === 11 || doc.length === 14)) errors.push("payerDocument must be 11 (CPF) or 14 (CNPJ).");

  if (payload.value === undefined || payload.value === null) errors.push("value is required.");
  else if (typeof payload.value !== "number" || Number.isNaN(payload.value)) errors.push("value must be a number.");
  else if (payload.value <= 0) errors.push("value must be greater than 0.");

  if (!payload.dueDate) errors.push("dueDate is required.");
  else if (!validateDateFormat(payload.dueDate)) errors.push("dueDate must be in YYYY-MM-DD format.");
  else if (!isValidCalendarDate(payload.dueDate)) errors.push("dueDate must be a valid calendar date.");

  if (!email) errors.push("email is required.");

  if (errors.length > 0) {
    return new Response(JSON.stringify({ valid: false, errors }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const normalized = {
    payerDocument: doc,
    value: Number(payload.value),
    dueDate: payload.dueDate,
    payerName: name,
    description: payload.description ?? null,
    email,
    phone,
  };

  const ASAAS_ACCESS_TOKEN = (Deno.env.get("ASAAS_ACCESS_TOKEN") || "").trim();
  const ASAAS_ENV = (Deno.env.get("ASAAS_ENV") || "production").trim().toLowerCase();

  if (!ASAAS_ACCESS_TOKEN) {
    return new Response(JSON.stringify({ valid: true, normalized, proxied: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const baseUrl = ASAAS_ENV === "sandbox" ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/api/v3";
  const headers = { "Content-Type": "application/json", "access_token": ASAAS_ACCESS_TOKEN };

  try {
    // 1) Buscar cliente por email
    const searchRes = await fetch(`${baseUrl}/customers?email=${encodeURIComponent(email)}`, { method: "GET", headers });
    if (!searchRes.ok) {
      const txt = await searchRes.text();
      return new Response(JSON.stringify({ error: "Erro ao buscar cliente no Asaas", details: txt }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const searchJson = await searchRes.json();
    const existing = Array.isArray(searchJson?.data) && searchJson.data.length > 0 ? searchJson.data[0] : null;

    let asaasCustomerId = existing?.id || "";
    if (!asaasCustomerId) {
      // 2) Criar cliente
      const createRes = await fetch(`${baseUrl}/customers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name,
          email,
          cpfCnpj: doc,
          mobilePhone: phone || undefined,
        }),
      });
      if (!createRes.ok) {
        const txt = await createRes.text();
        return new Response(JSON.stringify({ error: "Erro ao criar cliente no Asaas", details: txt }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const createJson = await createRes.json();
      asaasCustomerId = createJson?.id || "";
      if (!asaasCustomerId) {
        return new Response(JSON.stringify({ error: "Cliente criado sem id no Asaas", details: createJson }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 3) Criar cobrança BOLETO
    const payRes = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "BOLETO",
        value: normalized.value,
        dueDate: normalized.dueDate,
        description: normalized.description || `Pagamento boleto ${normalized.payerName}`,
        externalReference: `ORDER_${Date.now()}`,
        postalService: false,
      }),
    });
    const payText = await payRes.text();
    const contentType = payRes.headers.get("content-type") || "";
    const payBody = contentType.includes("application/json") ? JSON.parse(payText) : payText;

    if (!payRes.ok) {
      return new Response(JSON.stringify({ error: "Erro ao gerar boleto no Asaas", details: payBody }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ valid: true, normalized, proxied: true, asaas: payBody }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro inesperado ao chamar Asaas", details: String(err) }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
