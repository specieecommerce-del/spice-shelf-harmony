import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const normalizeInfinitePayHandle = (value: string | undefined | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  // Users may paste any of these forms:
  // - "@minhatag"
  // - "minhatag"
  // - "https://.../@minhatag" or "https://.../minhatag"
  // Normalize to just the handle.
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] ?? '';
    const fromUrl = last.replace(/^@/, '').trim();
    if (fromUrl) return fromUrl;
  } catch {
    // Not a URL
  }

  const afterAt = trimmed.includes('@') ? trimmed.slice(trimmed.lastIndexOf('@') + 1) : trimmed;
  const clean = afterAt.split(/[/?#]/)[0].trim();
  return clean || null;
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
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().regex(/^[0-9\s\-()]+$/).max(20).optional(),
}).optional();

const RequestSchema = z.object({
  items: z.array(CartItemSchema).min(1).max(50),
  customer: CustomerSchema,
  redirectUrl: z.string().url().max(500),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse body first to check for config check action
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      rawBody = {};
    }

    const bodyObj = rawBody as Record<string, unknown>;

    // Handle config check action
    if (bodyObj.action === 'check_config') {
      const infinitePayHandle = normalizeInfinitePayHandle(Deno.env.get('INFINITEPAY_HANDLE'));
      if (!infinitePayHandle) {
        return new Response(
          JSON.stringify({ configured: false, reason: 'INFINITEPAY_HANDLE not set' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate handle format (basic check)
      if (!/^[A-Za-z0-9._-]{2,120}$/.test(infinitePayHandle)) {
        return new Response(
          JSON.stringify({ configured: false, reason: 'Invalid handle format' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ configured: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const infinitePayHandle = normalizeInfinitePayHandle(Deno.env.get('INFINITEPAY_HANDLE'));
    if (!infinitePayHandle) {
      console.error('INFINITEPAY_HANDLE not configured');
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('InfinitePay handle loaded', {
      length: infinitePayHandle.length,
      preview: `${infinitePayHandle.slice(0, 3)}***${infinitePayHandle.slice(-2)}`,
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate input using already parsed body
    const validationResult = RequestSchema.safeParse(bodyObj);
    if (!validationResult.success) {
      console.error('Validation errors:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ error: 'Invalid input data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { items, customer, redirectUrl } = validationResult.data;
    
    console.log('Validated payment request:', { 
      itemCount: items.length, 
      hasCustomer: !!customer,
      redirectUrl 
    });

    // Calculate total in cents with validation
    const totalAmount = items.reduce((sum, item) => {
      const itemTotal = Math.round(item.price * item.quantity * 100);
      return sum + itemTotal;
    }, 0);

    // Validate total amount is reasonable
    if (totalAmount <= 0 || totalAmount > 100000000) { // Max R$ 1.000.000,00
      console.error('Invalid total amount:', totalAmount);
      return new Response(
        JSON.stringify({ error: 'Invalid order amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate unique order NSU
    const orderNsu = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Format items for InfinitePay
    const infinitePayItems = items.map(item => ({
      quantity: item.quantity,
      price: Math.round(item.price * 100),
      description: item.name.substring(0, 200), // Limit description length
    }));

    // Build webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/infinitepay-webhook`;

    // Build request body for InfinitePay
    const infinitePayBody: Record<string, unknown> = {
      handle: infinitePayHandle,
      redirect_url: redirectUrl,
      webhook_url: webhookUrl,
      order_nsu: orderNsu,
      items: infinitePayItems,
    };

    // Add sanitized customer info if provided
    if (customer) {
      infinitePayBody.customer = {
        name: customer.name?.substring(0, 100) || '',
        email: customer.email?.substring(0, 255) || '',
        phone_number: customer.phone ? `+55${customer.phone.replace(/\D/g, '').substring(0, 15)}` : '',
      };
    }

    console.log('Calling InfinitePay API for order:', orderNsu);

    // Call InfinitePay API
    const infinitePayResponse = await fetch('https://api.infinitepay.io/invoices/public/checkout/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(infinitePayBody),
    });

    let infinitePayData: any = null;
    try {
      infinitePayData = await infinitePayResponse.json();
    } catch (parseError) {
      console.error('Failed to parse InfinitePay response as JSON', parseError);
      try {
        infinitePayData = await infinitePayResponse.text();
      } catch {
        infinitePayData = null;
      }
    }

    if (!infinitePayResponse.ok) {
      const gatewayMessage =
        typeof infinitePayData?.message === 'string'
          ? infinitePayData.message
          : (typeof infinitePayData === 'string' ? infinitePayData : null);

      console.error('InfinitePay API error for order:', orderNsu, {
        status: infinitePayResponse.status,
        gatewayMessage,
        raw: infinitePayData,
      });
      return new Response(
        JSON.stringify({
          error: 'Unable to create payment link',
          gatewayMessage,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save order to database
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        order_nsu: orderNsu,
        customer_name: customer?.name?.substring(0, 100),
        customer_email: customer?.email?.substring(0, 255),
        customer_phone: customer?.phone?.substring(0, 20),
        items: items,
        total_amount: Math.round(totalAmount),
        status: 'pending',
        payment_link: infinitePayData.url,
      });

    if (orderError) {
      console.error('Error saving order:', orderNsu, orderError);
      // Still return the payment link even if we couldn't save the order
    } else {
      console.log('Order saved successfully:', orderNsu);

      // Send WhatsApp alert for new order (fire and forget)
      try {
        const alertPayload = {
          order_nsu: orderNsu,
          customer_name: customer?.name,
          customer_phone: customer?.phone,
          total_amount: totalAmount,
          payment_method: 'credit_card',
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
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentUrl: infinitePayData.url,
        orderNsu: orderNsu,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error creating payment link:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
