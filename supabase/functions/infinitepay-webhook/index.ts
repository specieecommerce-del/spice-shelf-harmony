import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  invoice_slug: string;
  amount: number;
  paid_amount: number;
  installments: number;
  capture_method: string; // 'credit_card' or 'pix'
  transaction_nsu: string;
  order_nsu: string;
  receipt_url: string;
  items: Array<{
    quantity: number;
    price: number;
    description: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();
    
    console.log('Received InfinitePay webhook:', JSON.stringify(payload, null, 2));

    const { order_nsu, transaction_nsu, invoice_slug, capture_method, paid_amount, installments, receipt_url } = payload;

    if (!order_nsu) {
      console.error('Missing order_nsu in webhook payload');
      return new Response(
        JSON.stringify({ success: false, message: 'Missing order_nsu' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update order status in database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_method: capture_method,
        transaction_nsu: transaction_nsu,
        invoice_slug: invoice_slug,
        receipt_url: receipt_url,
        installments: installments,
        paid_amount: paid_amount,
      })
      .eq('order_nsu', order_nsu)
      .select()
      .single();

    if (orderError) {
      console.error('Error updating order:', orderError);
      return new Response(
        JSON.stringify({ success: false, message: 'Order not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order updated successfully:', order);

    // Return success response to InfinitePay
    return new Response(
      JSON.stringify({ success: true, message: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
