import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// InfinitePay known IP ranges for webhook validation
// AWS São Paulo region IPs commonly used by Brazilian payment providers
// Note: Contact InfinitePay support to confirm their exact IP ranges
const ALLOWED_IP_PREFIXES = [
  '54.207.',   // AWS São Paulo region
  '18.231.',   // AWS São Paulo
  '52.67.',    // AWS São Paulo
  '177.71.',   // AWS São Paulo
  '15.228.',   // AWS São Paulo
  '18.229.',   // AWS São Paulo
  '18.230.',   // AWS São Paulo
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
  
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  return 'unknown';
}

function isAllowedIP(ip: string): boolean {
  // Log all webhook requests for audit trail
  console.log('Webhook request from IP:', ip);
  
  // If IP is unknown, reject the request
  if (ip === 'unknown') {
    console.warn('Rejecting request with unknown IP');
    return false;
  }
  
  // Check if IP matches any allowed prefix
  const isAllowed = ALLOWED_IP_PREFIXES.some(prefix => ip.startsWith(prefix));
  
  if (!isAllowed) {
    console.warn('IP not in allowed list:', ip);
  }
  
  return isAllowed;
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
    
    console.log('Processing validated webhook for order:', order_nsu, 'from IP:', clientIP);

    // Verify the order exists before updating
    const { data: existingOrder, error: checkError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('order_nsu', order_nsu)
      .maybeSingle();

    if (checkError) {
      console.error('Database error checking order:', order_nsu, checkError);
      return new Response(
        JSON.stringify({ success: false, message: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!existingOrder) {
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

    console.log('Order updated successfully:', order_nsu, 'Payment method:', capture_method);

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
