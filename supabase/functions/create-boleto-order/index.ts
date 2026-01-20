import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

serve(async (req) => {
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

    // Get boleto settings
    const { data: boletoSettings, error: settingsError } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'boleto_settings')
      .maybeSingle();

    if (settingsError || !boletoSettings?.value) {
      console.error('Boleto settings not found:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Boleto não configurado pela loja' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = boletoSettings.value as {
      bank_code: string;
      bank_name: string;
      agency: string;
      account: string;
      account_type: string;
      beneficiary_name: string;
      beneficiary_document: string;
      instructions: string;
      days_to_expire: number;
    };

    // Calculate total in cents
    const subtotal = items.reduce((sum, item) => {
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
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        order_nsu: orderNsu,
        customer_name: customer.name.substring(0, 100),
        customer_email: customer.email.substring(0, 255),
        customer_phone: customer.phone?.substring(0, 20),
        items: items,
        total_amount: totalAmountCents,
        status: 'pending_boleto',
        payment_method: 'boleto',
      });

    if (orderError) {
      console.error('Error saving boleto order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar pedido' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Boleto order saved successfully:', orderNsu);

    // Send WhatsApp alert for new order (fire and forget)
    try {
      const alertPayload = {
        order_nsu: orderNsu,
        customer_name: customer.name,
        customer_phone: customer.phone,
        total_amount: totalAmountCents,
        payment_method: 'boleto',
        items: items.map(item => ({
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
