/// <reference path="../deno-shims.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept, prefer",
};

type RegisteredSettings = {
  enabled: boolean;
  mode: "registered";
  provider: string;
  bank?: {
    code?: string;
    name?: string;
    wallet?: string;
    agreement?: string;
    agency?: string;
    agency_dv?: string;
    account?: string;
    account_dv?: string;
    beneficiary_name?: string;
    beneficiary_document?: string;
    modalidade?: string;
    nosso_mode?: "manual" | "provider";
    nosso_prefix?: string;
    nosso_start?: string;
  };
  api: {
    type: "cnab" | "api";
    environment: "homolog" | "production";
    endpoint?: string;
    client_id?: string;
    client_secret?: string;
    certificate_ref?: string;
  };
  billing: {
    days_to_expire: number;
    fine_percent: number;
    interest_percent_month: number;
    instructions: string;
    discount?: {
      type: "percent" | "value";
      value: number;
      until?: string;
    };
  };
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const action = (body as Record<string, unknown>)?.["action"];

    if (action === "get_settings") {
      const { data } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "boleto_settings")
        .maybeSingle();
      const v = (data?.value || null) as Record<string, unknown> | null;
      if (!v) {
        return new Response(JSON.stringify({ settings: null }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const mode = String((v as any)["mode"] || "manual");
      if (mode !== "registered") {
        return new Response(JSON.stringify({ settings: null }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const sandbox = Boolean((v as any)["sandbox"] ?? true);
      const bank = ((v as any)["registered"]?.["bank"] ?? {}) as Record<string, unknown>;
      const registered = ((v as any)["registered"] ?? {}) as Record<string, unknown>;
      const settings: RegisteredSettings = {
        enabled: Boolean((v as any)["enabled"] ?? true),
        mode: "registered",
        provider: String((v as any)["provider"] || ""),
        bank: {
          code: String(bank["code"] || ""),
          name: String(bank["name"] || ""),
          wallet: String(registered["wallet"] || ""),
          agreement: String(registered["convenio"] || ""),
          agency: String(registered["agency"] || ""),
          account: String(registered["account"] || ""),
          account_dv: String(registered["account_digit"] || ""),
          beneficiary_name: String(registered["beneficiary_name"] || ""),
          beneficiary_document: String(registered["beneficiary_document"] || ""),
        },
        api: {
          type: String((v as any)["provider"] || "").includes("bank") ? "cnab" : "api",
          environment: sandbox ? "homolog" : "production",
          endpoint: String(((registered["credentials"] as any)?.["api_endpoint"] ?? "")),
          client_id: String(((registered["credentials"] as any)?.["client_id"] ?? "")),
          client_secret: String(((registered["credentials"] as any)?.["client_secret"] ?? "")),
          certificate_ref: String(((registered["credentials"] as any)?.["certificate_ref"] ?? "")),
        },
        billing: {
          days_to_expire: Number((v as any)["days_to_expire"] ?? 3),
          fine_percent: Number(registered["fine_percent"] ?? 0),
          interest_percent_month: Number(registered["interest_monthly_percent"] ?? 0),
          instructions: String((v as any)["instructions"] ?? ""),
        },
      };
      const redacted = JSON.parse(JSON.stringify(settings)) as RegisteredSettings & {
        api: RegisteredSettings["api"] & { secrets_present?: { client_secret: boolean } };
      };
      if (redacted.api) {
        const secretsPresent = {
          client_secret: Boolean(redacted.api.client_secret),
        };
        delete redacted.api.client_secret;
        (redacted.api as RegisteredSettings["api"] & { secrets_present?: { client_secret: boolean } }).secrets_present =
          secretsPresent;
      }
      return new Response(JSON.stringify({ settings: redacted }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save_settings") {
      const valueToSave = (body as Record<string, unknown>)?.["value"] as RegisteredSettings | undefined;
      if (!valueToSave || valueToSave.mode !== "registered") {
        return new Response(JSON.stringify({ error: "Payload inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const provider = String(valueToSave.provider || "");
      const apiType = valueToSave.api?.type;
      const env = valueToSave.api?.environment;
      if (!provider || !apiType || !env) {
        return new Response(JSON.stringify({ error: "Campos obrigatórios ausentes" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const unifiedValue = {
        enabled: Boolean(valueToSave.enabled ?? true),
        mode: "registered",
        provider,
        environment: env === "homolog" ? "sandbox" : "production",
        days_to_expire: Number(valueToSave.billing?.days_to_expire ?? 3),
        instructions: String(valueToSave.billing?.instructions ?? ""),
        registered: {
          bank: {
            code: String(valueToSave.bank?.code ?? "").trim(),
            name: String(valueToSave.bank?.name ?? "").trim(),
          },
          agency: String(valueToSave.bank?.agency ?? "").trim(),
          account: String(valueToSave.bank?.account ?? "").trim(),
          account_digit: String(valueToSave.bank?.account_dv ?? "").trim(),
          wallet: String(valueToSave.bank?.wallet ?? "").trim(),
          convenio: String(valueToSave.bank?.agreement ?? "").trim(),
          beneficiary_name: String(valueToSave.bank?.beneficiary_name ?? "").trim(),
          beneficiary_document: String(valueToSave.bank?.beneficiary_document ?? "").trim(),
          interest_percent: Number(valueToSave.billing?.interest_percent_month ?? 0),
          fine_percent: Number(valueToSave.billing?.fine_percent ?? 0),
          webhook_secret: "",
          credentials: {
            api_endpoint: String(valueToSave.api?.endpoint ?? "").trim(),
            client_id: String(valueToSave.api?.client_id ?? "").trim(),
            client_secret: String(valueToSave.api?.client_secret ?? "").trim(),
            certificate_ref: String(valueToSave.api?.certificate_ref ?? "").trim(),
          },
        },
        manual: {
          bank_code: "",
          bank_name: "",
          agency: "",
          account: "",
          account_type: "corrente",
          beneficiary_name: "",
          beneficiary_document: "",
        },
      };
      await supabase
        .from("store_settings")
        .upsert(
          {
            key: "boleto_settings",
            value: unifiedValue,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "test_connection") {
      const { data } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "boleto_settings")
        .maybeSingle();
      const v = (data?.value || null) as Record<string, unknown> | null;
      if (!v) {
        return new Response(JSON.stringify({ success: false, error: "Sem configurações" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const provider = String((v as any)["provider"] || "");
      const env = Boolean((v as any)["sandbox"] ?? true) ? "homolog" : "production";
      // Validate basic fields
      if (!provider || !env) {
        return new Response(JSON.stringify({ success: false, error: "Campos inválidos" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Only allow test in homolog/sandbox
      if (env !== "homolog") {
        return new Response(JSON.stringify({ success: false, error: "Teste permitido apenas em homologação" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Simple API ping if endpoint available
      try {
        const endpoint = String((((v as any)["registered"]?.["credentials"] as any)?.["api_endpoint"] ?? ""));
        if (endpoint) {
          const pingUrl = endpoint;
          const res = await fetch(pingUrl, { method: "GET" });
          const ok = res.ok;
          return new Response(JSON.stringify({ success: ok, status: res.status }), {
            status: ok ? 200 : 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const totalAmountCents = 12345;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (Number((v as any)["days_to_expire"] ?? 3)));
        const orderRef = `TEST_${Date.now()}`;
        const bankObj = (((v as any)["registered"]?.["bank"]) ?? {}) as Record<string, unknown>;
        const bankCode = String(bankObj["code"] || "001");
        const agency = String(((v as any)["registered"]?.["agency"] ?? "0001"));
        const account = String(((v as any)["registered"]?.["account"] ?? "000000"));
        const raw = [
          String(bankCode).padStart(3, "0"),
          "9",
          String(agency || "").replace(/\D/g, "").padStart(4, "0"),
          String(account || "").replace(/\D/g, "").padStart(10, "0"),
          totalAmountCents.toString().padStart(10, "0"),
          dueDate.toISOString().slice(0, 10).replace(/\D/g, "").slice(2),
          orderRef.replace(/\D/g, "").slice(-7).padStart(7, "0"),
        ].join("");
        const targetLength = 47;
        const padded = raw.padEnd(targetLength - 1, "0");
        const digits = padded.split("").map((d) => parseInt(d, 10));
        let sum = 0;
        let factor = 2;
        for (let i = digits.length - 1; i >= 0; i--) {
          const calc = digits[i] * factor;
          sum += calc > 9 ? Math.floor(calc / 10) + (calc % 10) : calc;
          factor = factor === 2 ? 1 : 2;
        }
        const dv = (10 - (sum % 10)) % 10;
        const linhaDigitavel = padded + String(dv);
        const barcode = linhaDigitavel.replace(/\D/g, "");
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        let y = 800;
        const drawText = (text: string, bold = false, size = 12, color = rgb(0, 0, 0)) => {
          page.drawText(text, { x: 40, y, size, font: bold ? fontBold : font, color });
          y -= size + 8;
        };
        drawText("BOLETO DE TESTE", true, 16);
        drawText("HOMOLOGAÇÃO", true, 14, rgb(0.8, 0, 0));
        drawText(`Banco: ${String(bankObj["name"] || "Banco do Brasil")} (${bankCode})`);
        drawText(`Agência: ${agency}`);
        drawText(`Conta: ${account}`);
        drawText(`Favorecido: ${String(((v as any)["registered"]?.["beneficiary_name"]) || "Cedente Homologação")}`);
        drawText(`Documento: ${String(((v as any)["registered"]?.["beneficiary_document"]) || "00.000.000/0001-00")}`);
        drawText(`Referência: ${orderRef}`);
        drawText(`Vencimento: ${dueDate.toISOString().slice(0, 10).split("-").reverse().join("/")}`);
        drawText(`Valor: R$ ${(totalAmountCents / 100).toFixed(2).replace(".", ",")}`);
        drawText(`Linha Digitável: ${linhaDigitavel}`, true);
        const dgs = barcode.split("").map((d) => parseInt(d, 10));
        let x = 40;
        const barY = y - 10;
        const barHeight = 40;
        dgs.forEach((d, i) => {
          const w = 1 + (d % 3);
          if (i % 2 === 0) {
            page.drawRectangle({ x, y: barY, width: w, height: barHeight, color: rgb(0, 0, 0) });
          }
          x += w;
        });
        const pdfBytes = await pdfDoc.save();
        const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));
        const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;
        const providerTitleId = `mock_${Date.now()}`;
        return new Response(
          JSON.stringify({
            success: true,
            test_title: {
              provider_title_id: providerTitleId,
              linha_digitavel: linhaDigitavel,
              barcode,
              pdf_url: pdfDataUrl,
              status: "canceled",
            },
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (err) {
        console.error("Test connection error:", err);
        return new Response(JSON.stringify({ success: false, error: "Falha na conexão" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "sandbox_mark_paid") {
      const orderNsu = String((body as Record<string, unknown>)?.["order_nsu"] || "");
      const providerTitleId = String((body as Record<string, unknown>)?.["provider_title_id"] || "");
      const { data: settingsRow } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "boleto_settings")
        .maybeSingle();
      const settings = (settingsRow?.value || null) as Record<string, unknown> | null;
      const sandbox = String((settings as any)?.["environment"] ?? "sandbox") === "sandbox";
      if (!sandbox) {
        return new Response(JSON.stringify({ error: "Sandbox desativado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      let orderId: string | null = null;
      if (orderNsu) {
        const { data: orderRow } = await supabase
          .from("orders")
          .select("id")
          .eq("order_nsu", orderNsu)
          .maybeSingle();
        orderId = orderRow?.id ?? null;
      }
      if (providerTitleId) {
        await supabase
          .from("payment_titles")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("provider_title_id", providerTitleId);
      }
      if (orderId) {
        await supabase
          .from("payment_titles")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("order_id", orderId);
        await supabase
          .from("orders")
          .update({ status: "paid" })
          .eq("id", orderId);
      }
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        if (orderNsu) {
          fetch(`${supabaseUrl}/functions/v1/send-order-emails`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderNsu }),
          }).catch(() => {});
          fetch(`${supabaseUrl}/functions/v1/order-alert-whatsapp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_nsu: orderNsu, status: "paid" }),
          }).catch(() => {});
        }
      } catch (e) {
        const _err = e;
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-boleto-registered-settings error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
