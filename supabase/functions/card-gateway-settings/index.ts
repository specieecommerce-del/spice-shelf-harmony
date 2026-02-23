import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyAdmin(req: Request, supabaseUrl: string, supabaseServiceKey: string): Promise<{ isAdmin: boolean; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { isAdmin: false, error: "Token de autenticação não fornecido" };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || supabaseServiceKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
  if (error || !user) {
    return { isAdmin: false, error: "Usuário não autenticado" };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roles) {
    return { isAdmin: false, error: "Acesso não autorizado" };
  }

  return { isAdmin: true };
}

serve(async (req) => {
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

    // "check_config" is public (used during checkout), other actions require admin
    if (action !== 'check_config') {
      const { isAdmin, error: authError } = await verifyAdmin(req, supabaseUrl, supabaseServiceKey);
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: authError }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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

    // Check if card payment is configured (for checkout - public)
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

       const hasPaymentLink = !!settings.payment_link;
       const hasWhatsAppNumber = !!settings.whatsapp_number;
       const hasInfinitePayHandle = !!Deno.env.get('INFINITEPAY_HANDLE');
       const hasPagSeguroCredentials = !!(Deno.env.get('PAGSEGURO_EMAIL') && Deno.env.get('PAGSEGURO_TOKEN'));
       const isConfigured = settings.enabled === true && (
         (settings.gateway_type === 'external_link' && hasPaymentLink) ||
         (settings.gateway_type === 'whatsapp' && hasWhatsAppNumber) ||
         (settings.gateway_type === 'infinitepay' && hasInfinitePayHandle) ||
         (settings.gateway_type === 'pagseguro' && hasPagSeguroCredentials) ||
         (settings.gateway_type === 'manual')
       );

       return new Response(
         JSON.stringify({
           configured: !!isConfigured,
           gateway_type: settings.gateway_type,
           payment_link: settings.payment_link,
           whatsapp_number: settings.whatsapp_number,
           instructions: settings.instructions,
         }),
         { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
    }

    // Save card gateway settings (admin only - already verified above)
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
