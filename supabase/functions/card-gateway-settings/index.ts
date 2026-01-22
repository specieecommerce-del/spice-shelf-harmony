import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const action = body.action as string;

    // Get card gateway settings (for admin panel)
    if (action === 'get_settings') {
      console.log('Getting card gateway settings');
      
      const { data, error } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'card_gateway')
        .maybeSingle();

      if (error) {
        console.error('Error fetching card gateway settings:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch settings' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          settings: data?.value || null,
          configured: !!data?.value 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if card payment is configured (for checkout)
    if (action === 'check_config') {
      console.log('Checking card gateway configuration');
      
      const { data, error } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'card_gateway')
        .maybeSingle();

      if (error) {
        console.error('Error checking card gateway config:', error);
        return new Response(
          JSON.stringify({ configured: false, reason: 'Database error' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!data?.value) {
        return new Response(
          JSON.stringify({ configured: false, reason: 'Not configured' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const settings = data.value as {
        enabled?: boolean;
        gateway_type?: string;
        payment_link?: string;
        whatsapp_number?: string;
        instructions?: string;
      };

      // Check if enabled and has required fields
      const isConfigured = settings.enabled === true && (
        // For external link mode, need a payment link
        (settings.gateway_type === 'external_link' && settings.payment_link) ||
        // For WhatsApp mode, need a number
        (settings.gateway_type === 'whatsapp' && settings.whatsapp_number) ||
        // For InfinitePay, check the secret
        (settings.gateway_type === 'infinitepay' && Deno.env.get('INFINITEPAY_HANDLE')) ||
        // For manual/contact mode, just needs to be enabled
        (settings.gateway_type === 'manual')
      );

      return new Response(
        JSON.stringify({ 
          configured: isConfigured,
          gateway_type: settings.gateway_type,
          payment_link: settings.payment_link,
          whatsapp_number: settings.whatsapp_number,
          instructions: settings.instructions,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save card gateway settings (admin only)
    if (action === 'save_settings') {
      console.log('Saving card gateway settings');
      
      const settingsToSave = {
        enabled: body.enabled === true,
        gateway_type: body.gateway_type || 'manual',
        payment_link: body.payment_link || '',
        whatsapp_number: body.whatsapp_number || '',
        instructions: body.instructions || '',
        updated_at: new Date().toISOString(),
      };

      // Upsert the settings
      const { error } = await supabase
        .from('store_settings')
        .upsert({
          key: 'card_gateway',
          value: settingsToSave,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (error) {
        console.error('Error saving card gateway settings:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to save settings' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Configurações salvas com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in card-gateway-settings:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
