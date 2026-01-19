import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// InfinitePay known IP ranges for webhook validation
// These should be verified with InfinitePay documentation
const ALLOWED_IP_PREFIXES = [
  '54.207.', // AWS São Paulo region (commonly used by Brazilian payment providers)
  '18.231.', // AWS São Paulo
  '52.67.',  // AWS São Paulo
];

// Webhook payload validation schema
const WebhookPayloadSchema = z.object({
  invoice_slug: z.string().min(1).max(100).optional(),
  amount: z.number().positive().max(100000000).optional(),
  paid_amount: z.number().nonnegative().max(100000000),
  installments: z.number().int().positive().max(48),
  capture_method: z.enum(['credit_card', 'pix', 'debit_card', 'boleto']),
  transaction_nsu: z.string().min(1).max(100),
  order_nsu: z.string().min(1).max(100),
  receipt_url: z.string().url().max(500).optional(),
  items: z.array(z.object({
    quantity: z.number().int().positive(),
    price: z.number().positive(),
    description: z.string().max(200),
  })).optional(),
});

function getClientIP(req: Request): string {
  // Check various headers for the real IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

function isAllowedIP(ip: string): boolean {
  // In production, this should validate against InfinitePay's actual IP ranges
  // For now, we log the IP for monitoring but don't block
  // Once you confirm InfinitePay's IPs, enable strict validation
  console.log('Webhook request from IP:', ip);
  
  // Uncomment to enable strict IP validation:
  // return ALLOWED_IP_PREFIXES.some(prefix => ip.startsWith(prefix));
  
  return true; // Allow all for now, but log for monitoring
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests for webhooks
  if (req.method !== 'POST') {
    console.warn('Invalid method for webhook:', req.method);
    return new Response(
      JSON.stringify({ success: false, message: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validate IP address
    const clientIP = getClientIP(req);
    if (!isAllowedIP(clientIP)) {
      console.error('Webhook request from unauthorized IP:', clientIP);
      return new Response(
        JSON.stringify({ success: false, message: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate payload
    let rawPayload: unknown;
    try {
      rawPayload = await req.json();
    } catch {
      console.error('Invalid JSON in webhook payload');
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid payload format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validationResult = WebhookPayloadSchema.safeParse(rawPayload);
    if (!validationResult.success) {
      console.error('Webhook validation errors:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid payload data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = validationResult.data;
    const { order_nsu, transaction_nsu, invoice_slug, capture_method, paid_amount, installments, receipt_url } = payload;
    
    console.log('Processing validated webhook for order:', order_nsu);

    // Verify the order exists before updating
    const { data: existingOrder, error: checkError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('order_nsu', order_nsu)
      .single();

    if (checkError || !existingOrder) {
      console.error('Order not found for webhook:', order_nsu);
      return new Response(
        JSON.stringify({ success: false, message: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent duplicate processing
    if (existingOrder.status === 'paid') {
      console.log('Order already marked as paid:', order_nsu);
      return new Response(
        JSON.stringify({ success: true, message: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update order status in database
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_method: capture_method,
        transaction_nsu: transaction_nsu,
        invoice_slug: invoice_slug || null,
        receipt_url: receipt_url || null,
        installments: installments,
        paid_amount: Math.round(paid_amount),
      })
      .eq('order_nsu', order_nsu);

    if (orderError) {
      console.error('Error updating order:', order_nsu, orderError);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to update order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order updated successfully:', order_nsu);

    // Return success response to InfinitePay
    return new Response(
      JSON.stringify({ success: true, message: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error processing webhook:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
