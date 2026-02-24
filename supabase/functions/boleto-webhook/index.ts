
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, prefer, x-webhook-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    interface WebhookPayload {
      provider_title_id?: string;
      order_nsu?: string;
      status?: 'issued' | 'pending' | 'paid' | 'canceled' | 'expired' | string;
    }
    let payload: WebhookPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate secret
    const secretHeader = req.headers.get('x-webhook-secret') || '';
    // Try legacy boleto_settings first
    const [{ data: settingsRow }, { data: regRow }] = await Promise.all([
      supabase.from('store_settings').select('value').eq('key', 'boleto_settings').maybeSingle(),
      supabase.from('store_settings').select('value').eq('key', 'boleto_registered_settings').maybeSingle(),
    ]);
    const settings = settingsRow?.value as { registered?: { webhook_secret?: string } } | null;
    const reg = regRow?.value as { api?: { client_secret?: string } } | null;
    const configuredSecret = settings?.registered?.webhook_secret ?? reg?.api?.client_secret ?? '';
    if (!configuredSecret || secretHeader !== configuredSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const providerTitleId = payload?.provider_title_id ?? null;
    const orderNsu = payload?.order_nsu ?? null;
    const status = payload?.status ?? 'paid';

    // Update payment_titles
    let titleUpdateError: unknown = null;
    if (providerTitleId) {
      const { error } = await supabase
        .from('payment_titles')
        .update({ status: status === 'paid' ? 'paid' : status, paid_at: status === 'paid' ? new Date().toISOString() : null })
        .eq('provider_title_id', providerTitleId);
      titleUpdateError = error;
    }

    // Update order by NSU if provided
    if (orderNsu) {
      const { data: orderRow, error: fetchOrderError } = await supabase
        .from('orders')
        .select('id')
        .eq('order_nsu', orderNsu)
        .maybeSingle();
      if (!fetchOrderError && orderRow?.id) {
        const orderId = orderRow.id;
        const { error: titleByOrderError } = await supabase
          .from('payment_titles')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('order_id', orderId);
        if (titleByOrderError) {
          console.error('Payment title update by order error:', titleByOrderError);
        }
      }
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('order_nsu', orderNsu);
      if (orderError) {
        console.error('Order update error:', orderError);
      }
    }

    // Fire and forget: send emails and whatsapp
    try {
      if (orderNsu) {
        fetch(`${supabaseUrl}/functions/v1/send-order-emails`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderNsu }),
        }).catch(() => {});
        fetch(`${supabaseUrl}/functions/v1/order-alert-whatsapp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_nsu: orderNsu, status: 'paid' }),
        }).catch(() => {});
      }
    } catch (notifyErr) {
      console.error('Notification error:', notifyErr);
    }

    return new Response(JSON.stringify({ success: true, updated: true, title_error: titleUpdateError }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
