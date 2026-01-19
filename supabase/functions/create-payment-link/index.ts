import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  category: string;
}

interface CustomerInfo {
  name?: string;
  email?: string;
  phone?: string;
}

interface RequestBody {
  items: CartItem[];
  customer?: CustomerInfo;
  redirectUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const infinitePayHandle = Deno.env.get('INFINITEPAY_HANDLE');
    if (!infinitePayHandle) {
      console.error('INFINITEPAY_HANDLE not configured');
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { items, customer, redirectUrl }: RequestBody = await req.json();
    
    console.log('Received payment request:', { items, customer, redirectUrl });

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No items in cart' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate total in cents
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity * 100), 0);
    
    // Generate unique order NSU
    const orderNsu = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Format items for InfinitePay
    const infinitePayItems = items.map(item => ({
      quantity: item.quantity,
      price: Math.round(item.price * 100), // Convert to cents
      description: item.name,
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

    // Add customer info if provided
    if (customer) {
      infinitePayBody.customer = {
        name: customer.name || '',
        email: customer.email || '',
        phone_number: customer.phone ? `+55${customer.phone.replace(/\D/g, '')}` : '',
      };
    }

    console.log('Calling InfinitePay API:', JSON.stringify(infinitePayBody, null, 2));

    // Call InfinitePay API
    const infinitePayResponse = await fetch('https://api.infinitepay.io/invoices/public/checkout/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(infinitePayBody),
    });

    const infinitePayData = await infinitePayResponse.json();
    console.log('InfinitePay response:', JSON.stringify(infinitePayData, null, 2));

    if (!infinitePayResponse.ok) {
      console.error('InfinitePay API error:', infinitePayData);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment link', details: infinitePayData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save order to database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_nsu: orderNsu,
        customer_name: customer?.name,
        customer_email: customer?.email,
        customer_phone: customer?.phone,
        items: items,
        total_amount: Math.round(totalAmount),
        status: 'pending',
        payment_link: infinitePayData.url,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error saving order:', orderError);
      // Still return the payment link even if we couldn't save the order
    } else {
      console.log('Order saved:', order);
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
    console.error('Error creating payment link:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
