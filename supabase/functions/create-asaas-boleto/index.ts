/// <reference path="../deno-shims.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept, prefer",
};

type Item = {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
};

type Customer = {
  name: string;
  email: string;
  phone?: string;
  cpfCnpj?: string;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = rawBody as {
      items: Item[];
      customer: Customer;
      coupon?: { code: string; discountAmount: number } | null;
      externalReference?: string;
      description?: string;
    };

    const items = Array.isArray(body.items) ? body.items : [];
    const customer = (body.customer || {}) as Customer;
    if (!customer.name || !customer.email) {
      return new Response(JSON.stringify({ error: "Missing customer name/email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const total = items.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0), 0);
    const discount = body.coupon?.discountAmount ? Number(body.coupon.discountAmount) : 0;
    const totalAmount = Math.max(0, total - discount);

    // Load boleto settings and Asaas credentials
    const { data: settingsRow } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "boleto_settings")
      .maybeSingle();

    const v = (settingsRow?.value ?? null) as Record<string, unknown> | null;
    if (!v) {
      return new Response(JSON.stringify({ error: "Boleto settings not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const provider = String(v["provider"] || (v["registered"] as any)?.["provider"] || "").toLowerCase();
    const mode = String(v["mode"] || "manual").toLowerCase();
    if ((mode !== "registered" && mode !== "asaas") || !provider.includes("asaas")) {
      return new Response(JSON.stringify({ error: "Asaas not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const daysToExpire = Number(v["days_to_expire"] ?? 3);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysToExpire);
    const dueDateStr = dueDate.toISOString().slice(0, 10);

    const registered = (v["registered"] ?? {}) as Record<string, unknown>;
    const credentials = (registered["credentials"] ?? {}) as Record<string, unknown>;
    const apiKey = String(credentials["client_secret"] || credentials["api_key"] || "").trim();
    const env = String(v["environment"] || "sandbox");
    const baseUrl = env === "production" ? "https://api.asaas.com/api/v3" : "https://sandbox.asaas.com/api/v3";
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Asaas API key missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = {
      "Content-Type": "application/json",
      "access_token": apiKey,
    };

    // Find or create customer in Asaas
    let asaasCustomerId = "";
    try {
      const searchUrl = `${baseUrl}/customers?email=${encodeURIComponent(customer.email)}`;
      const searchRes = await fetch(searchUrl, { method: "GET", headers });
      const searchJson = await searchRes.json();
      const found = (searchJson?.data || []).find((c: any) => c?.email === customer.email);
      if (found?.id) {
        asaasCustomerId = String(found.id);
      } else {
        const createRes = await fetch(`${baseUrl}/customers`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: customer.name,
            email: customer.email,
            cpfCnpj: customer.cpfCnpj || undefined,
            mobilePhone: customer.phone || undefined,
          }),
        });
        const createJson = await createRes.json();
        if (!createRes.ok || !createJson?.id) {
          return new Response(JSON.stringify({ error: "Failed to create Asaas customer", detail: createJson }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        asaasCustomerId = String(createJson.id);
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: "Asaas customer error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderRef = body.externalReference || `ORDER_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const description = body.description || `Pedido ${orderRef}`;

    // Create payment in Asaas
    let paymentJson: any;
    try {
      const payRes = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType: "BOLETO",
          value: Number(totalAmount.toFixed(2)),
          dueDate: dueDateStr,
          description,
          externalReference: orderRef,
          postalService: false,
        }),
      });
      paymentJson = await payRes.json();
      if (!payRes.ok || !paymentJson?.id) {
        return new Response(JSON.stringify({ error: "Failed to create Asaas payment", detail: paymentJson }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: "Asaas payment error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const boletoUrl = paymentJson?.bankSlipUrl || paymentJson?.invoiceUrl || "";
    const linhaDigitavel = paymentJson?.identificationField || "";
    const barcode = paymentJson?.barcode || "";

    // Save order with boleto/provider metadata
    const { data: insertedOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_nsu: orderRef,
        customer_name: customer.name.substring(0, 100),
        customer_email: customer.email.substring(0, 255),
        customer_phone: (customer.phone || "").substring(0, 20),
        items: items,
        total_amount: Math.round(totalAmount * 100),
        status: "pending_boleto",
        payment_method: "boleto",
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("Order insert error:", orderError);
      return new Response(JSON.stringify({ error: "Erro ao salvar pedido" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save payment title with boleto details
    try {
      await supabase.from("payment_titles").insert({
        order_id: insertedOrder?.id,
        method: "boleto",
        mode: "registered",
        provider: "asaas",
        provider_title_id: String(paymentJson?.id || ""),
        status: "issued",
        amount_cents: Math.round(totalAmount * 100),
        due_date: dueDateStr,
        linha_digitavel: linhaDigitavel,
        barcode: barcode,
        pdf_url: boletoUrl,
      });
    } catch (e) {
      console.error("Payment title insert error:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderNsu: orderRef,
        totalAmount,
        dueDate: new Date(dueDateStr).toISOString(),
        boletoData: {
          bankCode: "",
          bankName: "Asaas",
          agency: "",
          account: "",
          accountType: "",
          beneficiaryName: "",
          beneficiaryDocument: "",
          instructions: `Boleto gerado via Asaas. Linha digitável: ${linhaDigitavel}`,
        },
        linhaDigitavel,
        barcode,
        pdfUrl: boletoUrl,
        asaasPaymentId: paymentJson?.id || "",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
