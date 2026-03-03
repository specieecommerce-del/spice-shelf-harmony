import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept, prefer",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_MODE = "sandbox" as const;
type Mode = "prod" | "sandbox";
let activeMode: Mode = DEFAULT_MODE;

function getAsaasKey(mode: Mode): string | null {
  if (mode === "prod") return Deno.env.get("ASAAS_API_KEY_PROD") ?? null;
  return Deno.env.get("ASAAS_API_KEY_SANDBOX") ?? null;
}

async function handleSetMode(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const mode = String(body?.mode || "").trim();
    if (mode !== "prod" && mode !== "sandbox") {
      return new Response(JSON.stringify({ error: "Invalid mode. Use \"prod\" or \"sandbox\"." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const key = getAsaasKey(mode as Mode);
    if (!key) {
      return new Response(JSON.stringify({ error: `Secret for mode '${mode}' not found in environment.` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    activeMode = mode as Mode;
    return new Response(JSON.stringify({ ok: true, mode: activeMode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid JSON body", detail: (err as Error)?.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function handleCharge(req: Request): Promise<Response> {
  try {
    const key = getAsaasKey(activeMode);
    if (!key) {
      return new Response(JSON.stringify({ error: `Key for active mode '${activeMode}' not found` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const payload = await req.json();
    const asaasUrl =
      activeMode === "prod"
        ? "https://api.asaas.com/v3/payments"
        : "https://api-sandbox.asaas.com/v3/payments";

    const res = await fetch(asaasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    const contentType = res.headers.get("content-type") || "";
    const responseBody = contentType.includes("application/json") ? JSON.parse(text || "{}") : { raw: text };

    return new Response(JSON.stringify({ status: res.status, body: responseBody }), {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error)?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const url = new URL(req.url);
  // Extract subpath after '/asaas-proxy'
  const match = url.pathname.match(/\/asaas-proxy(\/.*)?$/);
  const subpath = (match?.[1] || "").replace(/\/$/, "");

  if (req.method === "POST" && subpath === "/set-mode") {
    return handleSetMode(req);
  }

  if (req.method === "POST" && subpath === "/charge") {
    return handleCharge(req);
  }

  return new Response(
    JSON.stringify({ message: "asaas-proxy function. Routes: POST /set-mode, POST /charge", mode: activeMode }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
