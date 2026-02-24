import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, prefer',
};

// Input validation schemas
const CartItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string().min(1).max(200),
  price: z.number().positive().max(1000000),
  quantity: z.number().int().positive().max(100),
  image: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
});

const CustomerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(20).optional(),
  cpf: z.string().max(20).optional(),
});

const RequestSchema = z.object({
  items: z.array(CartItemSchema).min(1).max(50),
  customer: CustomerSchema,
  coupon: z.object({
    code: z.string(),
    discountAmount: z.number(),
  }).optional().nullable(),
});

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate input
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      console.error('Invalid JSON in request body');
      return new Response(
        JSON.stringify({ error: 'Formato de requisição inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validationResult = RequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      console.error('Validation errors:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ error: 'Dados inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { items, customer, coupon } = validationResult.data;
    const itemsLocal = items as Array<{
      id: string | number;
      name: string;
      price: number;
      quantity: number;
      image?: string;
      category?: string;
    }>;

    // Basic rate limit by customer email within 60 seconds
    try {
      if (customer.email) {
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('id, created_at')
          .eq('customer_email', customer.email)
          .gte('created_at', oneMinuteAgo);
        if (Array.isArray(recentOrders) && recentOrders.length >= 3) {
          return new Response(
            JSON.stringify({ error: 'Muitas tentativas. Tente novamente mais tarde.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } catch {
      // ignore rate limit errors
    }

    // Get unified boleto_settings
    const { data: boletoSettings, error: settingsError } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'boleto_settings')
      .maybeSingle();
    const v = boletoSettings?.value as Record<string, unknown> | undefined;
    const isNewSchema = typeof v?.['mode'] === 'string' || v?.['manual'] || v?.['enabled'] !== undefined;
    let settings: {
      bank_code: string;
      bank_name: string;
      agency: string;
      account: string;
      account_type: string;
      beneficiary_name: string;
      beneficiary_document: string;
      instructions: string;
      days_to_expire: number;
      mode?: 'manual' | 'registered';
      provider?: string;
    };
    if (!v) {
      return new Response(
        JSON.stringify({ error: 'Boleto não configurado pela loja' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const mode = String(v['mode'] || 'manual');
    const days_to_expire = Number(v['days_to_expire'] ?? 3);
    const instructions = String(v['instructions'] ?? '');
    if (mode === 'registered') {
      const reg = (v['registered'] ?? {}) as Record<string, unknown>;
      const bank = (reg['bank'] ?? {}) as Record<string, unknown>;
      settings = {
        bank_code: String(bank['code'] || ''),
        bank_name: String(bank['name'] || ''),
        agency: String(reg['agency'] || ''),
        account: String(reg['account'] || ''),
        account_type: 'corrente',
        beneficiary_name: String(reg['beneficiary_name'] || ''),
        beneficiary_document: String(reg['beneficiary_document'] || ''),
        instructions,
        days_to_expire,
        mode: 'registered',
        provider: String(v['provider'] || ''),
      };
    } else {
      const manual = (v['manual'] ?? {}) as Record<string, unknown>;
      settings = {
        bank_code: String(manual['bank_code'] || ''),
        bank_name: String(manual['bank_name'] || ''),
        agency: String(manual['agency'] || ''),
        account: String(manual['account'] || ''),
        account_type: String(manual['account_type'] || 'corrente'),
        beneficiary_name: String(manual['beneficiary_name'] || ''),
        beneficiary_document: String(manual['beneficiary_document'] || ''),
        instructions,
        days_to_expire,
        mode: 'manual',
        provider: 'bank',
      };
    }

    // Calculate total in cents
    const subtotal = itemsLocal.reduce((sum: number, item) => {
      const itemTotal = Math.round(item.price * item.quantity * 100);
      return sum + itemTotal;
    }, 0);

    const discountCents = coupon ? Math.round(coupon.discountAmount * 100) : 0;
    const totalAmountCents = Math.max(0, subtotal - discountCents);
    const totalAmount = totalAmountCents / 100;

    // Generate unique order NSU
    const orderNsu = `BOL_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (settings.days_to_expire || 3));

    console.log('Creating boleto order:', orderNsu, 'Total:', totalAmount);

    // Save order to database
    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_nsu: orderNsu,
        customer_name: customer.name.substring(0, 100),
        customer_email: customer.email.substring(0, 255),
        customer_phone: customer.phone?.substring(0, 20),
        items: itemsLocal,
        total_amount: totalAmountCents,
        status: 'pending_boleto',
        payment_method: 'boleto',
      })
      .select('id')
      .single();

    if (orderError) {
      console.error('Error saving boleto order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar pedido' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Boleto order saved successfully:', orderNsu);

    // Create payment title record (manual or registered placeholder)
    const computeLinhaDigitavel = () => {
      const raw = [
        settings.bank_code.padStart(3, '0'),
        '9',
        String(settings.agency || '').replace(/\D/g, '').padStart(4, '0'),
        String(settings.account || '').replace(/\D/g, '').padStart(10, '0'),
        totalAmountCents.toString().padStart(10, '0'),
        dueDate.toISOString().slice(0, 10).replace(/\D/g, '').slice(2),
        orderNsu.replace(/\D/g, '').slice(-7).padStart(7, '0'),
      ].join('');
      const targetLength = 47;
      const padded = raw.padEnd(targetLength - 1, '0');
      const digits = padded.split('').map((d) => parseInt(d, 10));
      let sum = 0;
      let factor = 2;
      for (let i = digits.length - 1; i >= 0; i--) {
        const calc = digits[i] * factor;
        sum += calc > 9 ? Math.floor(calc / 10) + (calc % 10) : calc;
        factor = factor === 2 ? 1 : 2;
      }
      const dv = (10 - (sum % 10)) % 10;
      const linha = padded + String(dv);
      return linha;
    };

    const linhaDigitavel = computeLinhaDigitavel();
    const barcode = linhaDigitavel.replace(/\D/g, '');

    // Generate local PDF receipt (manual mode only)
    let pdfDataUrl: string | null = null;
    try {
      if (settings.mode !== 'registered') {
        const { data: aboutRow } = await supabase
          .from('store_settings')
          .select('value')
          .eq('key', 'about_us')
          .maybeSingle();
        const aboutVal = (aboutRow?.value ?? {}) as Record<string, unknown>;
        const logoUrl = String(aboutVal['logo_url'] ?? '');
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        let y = 780;
        if (logoUrl) {
          try {
            const res = await fetch(logoUrl);
            const buf = new Uint8Array(await res.arrayBuffer());
            let img;
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('png')) {
              img = await pdfDoc.embedPng(buf);
            } else {
              img = await pdfDoc.embedJpg(buf);
            }
            const iw = 160;
            const ih = (img.height / img.width) * iw;
            page.drawImage(img, { x: 40, y: 800 - ih, width: iw, height: ih });
          } catch (e) {
            const _e = e;
          }
        }
        page.drawText("Boleto provisório", { x: 420, y: 800, size: 12, font: fontBold, color: rgb(0.8, 0, 0) });
        page.drawText(settings.beneficiary_name || "", { x: 40, y: 760, size: 14, font: fontBold, color: rgb(0,0,0) });
        page.drawText(`CNPJ: ${settings.beneficiary_document}`, { x: 40, y: 740, size: 12, font: font, color: rgb(0,0,0) });
        page.drawText(`Pedido: ${orderNsu}`, { x: 40, y: 720, size: 12, font: font, color: rgb(0,0,0) });
        page.drawText(`Banco: ${settings.bank_name} (${settings.bank_code}) • Agência ${settings.agency} • Conta ${settings.account}`, { x: 40, y: 700, size: 11, font: font, color: rgb(0,0,0) });
        page.drawRectangle({ x: 40, y: 650, width: 515, height: 60, color: rgb(0.95, 0.95, 0.95) });
        page.drawText("Valor", { x: 50, y: 695, size: 10, font: fontBold, color: rgb(0.4,0.4,0.4) });
        page.drawText(`R$ ${(totalAmountCents/100).toFixed(2).replace(".", ",")}`, { x: 50, y: 675, size: 18, font: fontBold, color: rgb(0,0,0) });
        const venc = dueDate.toISOString().slice(0,10).split("-").reverse().join("/");
        page.drawText("Vencimento", { x: 330, y: 695, size: 10, font: fontBold, color: rgb(0.4,0.4,0.4) });
        page.drawText(venc, { x: 330, y: 675, size: 18, font: fontBold, color: rgb(0,0,0) });
        page.drawText("Linha Digitável", { x: 40, y: 620, size: 10, font: fontBold, color: rgb(0.4,0.4,0.4) });
        page.drawText(linhaDigitavel, { x: 40, y: 600, size: 12, font: fontBold, color: rgb(0,0,0) });
        const digits = barcode.split("").map((d) => parseInt(d, 10));
        let x = 40;
        const barY = 560;
        const barHeight = 40;
        digits.forEach((d, i) => {
          const w = 1 + (d % 3);
          if (i % 2 === 0) {
            page.drawRectangle({ x, y: barY, width: w, height: barHeight, color: rgb(0,0,0) });
          }
          x += w;
        });
        y = 500;
        if (settings.instructions) {
          page.drawText("Instruções", { x: 40, y, size: 12, font: fontBold, color: rgb(0,0,0) });
          y -= 18;
          const instructions = settings.instructions;
          const chunks = instructions.match(/.{1,80}/g) || [instructions];
          chunks.forEach((line) => {
            page.drawText(line, { x: 40, y, size: 11, font: font, color: rgb(0,0,0) });
            y -= 16;
          });
        }
        const pdfBytes = await pdfDoc.save();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));
        pdfDataUrl = `data:application/pdf;base64,${base64}`;
      }
    } catch (pdfErr) {
      console.error('Error generating PDF:', pdfErr);
      pdfDataUrl = null;
    }

    // Adapter: issueBoleto(settings, orderData)
    type ProviderIssueResult = {
      id: string;
      linha_digitavel: string;
      barcode: string;
      pdf_url: string | null;
      boleto_url?: string | null;
      provider_title_id?: string | null;
    };
    async function issueBoleto(
      fullSettings: {
        provider?: string;
        environment?: 'sandbox' | 'production';
        bank_code?: string;
        agency?: string;
        account?: string;
      },
      orderData: { amount_cents: number; due_date: Date; order_nsu: string }
    ): Promise<ProviderIssueResult> {
      const env = (fullSettings.environment || 'sandbox') as 'sandbox' | 'production';
      if (env === 'sandbox') {
        return {
          id: `sandbox_${Date.now()}`,
          linha_digitavel: "00000 00000 00000 00000 000000000000",
          barcode: "00000000000000000000000000000000000000000000",
          pdf_url: null,
          provider_title_id: `sandbox_${Date.now()}`,
        };
      }
      // Produção: integrar com provider real quando disponível
      // Placeholder: lança erro até possuir integração oficial
      throw new Error('Provider de boleto registrado não configurado');
    }

    let paymentTitleId: string | null = null;
    let officialLinhaDigitavel = linhaDigitavel;
    let officialBarcode = barcode;
    let officialPdfUrl: string | null = pdfDataUrl;
    let officialProviderTitleId: string | null = null;
    let providerResult: ProviderIssueResult | null = null;
    try {
      if (settings.mode === 'registered') {
        const environment = typeof v?.['environment'] === 'string'
          ? String(v['environment'])
          : ((v?.['sandbox'] ?? true) ? 'sandbox' : 'production');
        const adapterRes = await issueBoleto(
          { provider: settings.provider, environment: environment as 'sandbox' | 'production', bank_code: settings.bank_code, agency: settings.agency, account: settings.account },
          { amount_cents: totalAmountCents, due_date: dueDate, order_nsu: orderNsu }
        );
        providerResult = adapterRes;
        officialLinhaDigitavel = adapterRes.linha_digitavel;
        officialBarcode = adapterRes.barcode;
        officialPdfUrl = adapterRes.pdf_url ?? null;
        officialProviderTitleId = adapterRes.provider_title_id ?? adapterRes.id;
      }
      const { data: titleRow } = await supabase
        .from('payment_titles')
        .insert({
          order_id: insertedOrder?.id,
          method: 'boleto',
          mode: settings.mode === 'registered' ? 'registered' : 'manual',
          provider: settings.mode === 'registered' ? settings.provider : 'bank',
          provider_title_id: officialProviderTitleId,
          status: 'issued',
          amount_cents: totalAmountCents,
          due_date: dueDate.toISOString().slice(0,10),
          linha_digitavel: officialLinhaDigitavel,
          barcode: officialBarcode,
          pdf_url: officialPdfUrl,
        })
        .select('id')
        .single();
      paymentTitleId = titleRow?.id ?? null;
    } catch (titleErr) {
      console.error('Error creating payment title:', titleErr);
      // Non-blocking for now
    }

    // Send WhatsApp alert for new order (fire and forget)
    try {
      const alertPayload = {
        order_nsu: orderNsu,
        customer_name: customer.name,
        customer_phone: customer.phone,
        total_amount: totalAmountCents,
        payment_method: 'boleto',
        items: itemsLocal.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: Math.round(item.price * 100),
        })),
      };

      fetch(`${supabaseUrl}/functions/v1/order-alert-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertPayload),
      }).catch(err => console.error('WhatsApp alert failed:', err));
    } catch (alertError) {
      console.error('Error sending WhatsApp alert:', alertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderNsu,
        totalAmount,
        dueDate: dueDate.toISOString(),
        boletoData: {
          bankCode: settings.bank_code,
          bankName: settings.bank_name,
          agency: settings.agency,
          account: settings.account,
          accountType: settings.account_type,
          beneficiaryName: settings.beneficiary_name,
          beneficiaryDocument: settings.beneficiary_document,
          instructions: settings.instructions,
        },
        linhaDigitavel: officialLinhaDigitavel,
        barcode: officialBarcode,
        pdfUrl: officialPdfUrl,
        paymentTitleId,
        providerResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error creating boleto order:', error);
    return new Response(
      JSON.stringify({ error: 'Erro inesperado' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
