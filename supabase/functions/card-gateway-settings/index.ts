/// <reference path="../deno-shims.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, prefer',
};

serve(async (req: Request) => {
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

    // Per-gateway storage keys
    const allowedGateways = new Set(["infinitepay", "pagseguro"]);
    function keyForGateway(gateway: unknown) {
      const g = String(gateway || "");
      if (!allowedGateways.has(g)) {
        throw new Error("Gateway inválido");
      }
      return `card_gateway_${g}`;
    }

    // Get settings for a specific gateway
    if (action === 'get_settings') {
      const gateway = body.gateway;
      let key: string;
      try {
        key = keyForGateway(gateway);
      } catch (e) {
        return new Response(
          JSON.stringify({ error: (e as Error).message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { data, error } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', key)
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
          settings: data?.value ?? { enabled: false, payment_link: "", whatsapp_number: "", instructions: "" }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if a specific gateway is configured
    if (action === 'check_config') {
      const gateway = body.gateway;
      let key: string;
      try {
        key = keyForGateway(gateway);
      } catch (e) {
        return new Response(
          JSON.stringify({ configured: false, error: (e as Error).message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { data, error } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', key)
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
          JSON.stringify({ configured: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const settings = data.value as { enabled?: boolean } | null;
      const isConfigured = settings?.enabled === true;

      return new Response(
        JSON.stringify({
          configured: !!isConfigured,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save settings for a specific gateway
    if (action === 'save_settings') {
      const gateway = body.gateway;
      let key: string;
      try {
        key = keyForGateway(gateway);
      } catch (e) {
        return new Response(
          JSON.stringify({ error: (e as Error).message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const settingsToSave = {
        enabled: body.enabled === true,
        payment_link: String(body.payment_link || ''),
        whatsapp_number: String(body.whatsapp_number || ''),
        instructions: String(body.instructions || ''),
        updated_at: new Date().toISOString(),
      };

      // Upsert the settings
      const { error } = await supabase
        .from('store_settings')
        .upsert({
          key,
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
