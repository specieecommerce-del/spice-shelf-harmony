import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema - accepts both ORDER_ and PIX_ prefixes
// NOTE: .trim() to avoid false negatives from leading/trailing whitespace
const RequestSchema = z.object({
  orderNsu: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^(ORDER|PIX)_[0-9]+_[a-z0-9]+$/),
});

type OrderStatusRow = {
  id: string;
  order_nsu: string;
  status: string;
  total_amount: number;
  paid_amount: number | null;
  payment_method: string | null;
  installments: number | null;
  receipt_url: string | null;
  created_at: string;
};

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
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validationResult = RequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      console.error('Validation errors:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ error: 'Invalid order reference' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderNsu } = validationResult.data;
    
    console.log('Checking payment status for order:', orderNsu);

    // Prefer the RPC (consistent, minimal fields), but fall back to a direct query
    // to avoid runtime failures if the RPC signature ever drifts.
    const { data: orders, error: rpcError } = await supabase
      .rpc('check_order_status', { p_order_nsu: orderNsu });

    let order: OrderStatusRow | null = (orders && orders.length > 0 ? (orders[0] as OrderStatusRow) : null);

    if (rpcError) {
      console.error('RPC error fetching order (fallback to direct query):', orderNsu, rpcError);

      const { data: directOrder, error: directError } = await supabase
        .from('orders')
        .select('id, order_nsu, status, total_amount, paid_amount, payment_method, installments, receipt_url, created_at')
        .eq('order_nsu', orderNsu)
        .maybeSingle();

      if (directError) {
        console.error('Direct query error fetching order:', orderNsu, directError);
        return new Response(
          JSON.stringify({ error: 'Unable to retrieve order status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      order = directOrder as OrderStatusRow | null;
    }

    if (!order) {
      console.log('Order not found:', orderNsu);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order found:', orderNsu, 'Status:', order.status);

    // Return only safe, minimal order information
    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          orderNsu: order.order_nsu,
          status: order.status,
          totalAmount: order.total_amount,
          paidAmount: order.paid_amount,
          paymentMethod: order.payment_method,
          installments: order.installments,
          receiptUrl: order.receipt_url,
          createdAt: order.created_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error checking payment:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
