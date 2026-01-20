import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schemas
const CartItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  price: z.number().positive().max(1000000),
  quantity: z.number().int().positive().max(100),
  image: z.string().max(500),
  category: z.string().max(100),
});

const CustomerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(20).optional(),
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

    // Get PIX settings
    const { data: pixSettings, error: pixError } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'pix_settings')
      .maybeSingle();

    if (pixError || !pixSettings?.value) {
      console.error('PIX not configured');
      return new Response(
        JSON.stringify({ error: 'PIX não configurado pela loja' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = pixSettings.value as {
      pix_key: string;
      pix_key_type: string;
      merchant_name: string;
      merchant_city: string;
    };

    // Calculate total
    let totalAmount = items.reduce((sum, item) => {
      return sum + Math.round(item.price * item.quantity * 100);
    }, 0);

    // Apply coupon discount if present
    if (coupon && coupon.discountAmount > 0) {
      totalAmount = Math.max(0, totalAmount - Math.round(coupon.discountAmount * 100));
    }

    // Validate total amount
    if (totalAmount <= 0 || totalAmount > 100000000) {
      console.error('Invalid total amount:', totalAmount);
      return new Response(
        JSON.stringify({ error: 'Valor do pedido inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique order NSU
    const orderNsu = `PIX_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const txId = orderNsu.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25);

    console.log('Creating PIX order:', orderNsu);

    // Save order to database
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        order_nsu: orderNsu,
        customer_name: customer.name.substring(0, 100),
        customer_email: customer.email.substring(0, 255),
        customer_phone: customer.phone?.substring(0, 20),
        items: items,
        total_amount: totalAmount,
        status: 'pending_pix',
        payment_method: 'pix',
      });

    if (orderError) {
      console.error('Error saving order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar pedido' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('PIX order created successfully:', orderNsu);

    // Send WhatsApp alert for new order (fire and forget)
    try {
      const alertPayload = {
        order_nsu: orderNsu,
        customer_name: customer.name,
        customer_phone: customer.phone,
        total_amount: totalAmount,
        payment_method: 'pix',
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
        orderNsu: orderNsu,
        txId: txId,
        totalAmount: totalAmount / 100, // Return in reais
        pixSettings: {
          pixKey: settings.pix_key,
          pixKeyType: settings.pix_key_type,
          merchantName: settings.merchant_name,
          merchantCity: settings.merchant_city,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro inesperado' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
