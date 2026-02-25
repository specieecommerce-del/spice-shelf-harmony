/// <reference path="../deno-shims.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get authorization header for user verification
    const authHeader = req.headers.get('authorization');
    
    const body = await req.json();
    const { action } = body;

    // Action: get_pix_for_payment - Public endpoint to get PIX data for checkout
    if (action === 'get_pix_for_payment') {
      console.log('Fetching PIX settings for payment...');
      
      const { data: pixSettings, error } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'pix_settings')
        .maybeSingle();

      if (error) {
        console.error('Error fetching PIX settings:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar configurações PIX' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: overrideRow } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'pix_settings_override')
        .maybeSingle();
      const overrideEnabled = (overrideRow?.value as Record<string, unknown> | null)?.['enabled'];
      if (overrideEnabled === false) {
        return new Response(
          JSON.stringify({ configured: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!pixSettings?.value) {
        return new Response(
          JSON.stringify({ error: 'PIX não configurado', configured: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const settings = pixSettings.value as {
        pix_key: string;
        pix_key_type: string;
        merchant_name: string;
        merchant_city: string;
      };

      return new Response(
        JSON.stringify({
          configured: true,
          pixKey: settings.pix_key,
          pixKeyType: settings.pix_key_type,
          merchantName: settings.merchant_name,
          merchantCity: settings.merchant_city,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Public toggle for PIX override enabled/disabled
    if (action === 'set_enabled') {
      const enabled = Boolean(body?.enabled ?? true);
      const { error: upsertError } = await supabase
        .from('store_settings')
        .upsert({
          key: 'pix_settings_override',
          value: { enabled },
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key',
        });
      if (upsertError) {
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar status do PIX' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin actions require authentication
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user and admin role
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado - apenas administradores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // (set_enabled now handled above as public)

    // Action: save_pix - Save PIX settings
    if (action === 'save_pix') {
      const { pix_key, pix_key_type, merchant_name, merchant_city } = body;

      if (!pix_key || !pix_key_type || !merchant_name || !merchant_city) {
        return new Response(
          JSON.stringify({ error: 'Todos os campos são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Saving PIX settings for admin:', user.id);

      // Upsert PIX settings
      const { error: upsertError } = await supabase
        .from('store_settings')
        .upsert({
          key: 'pix_settings',
          value: {
            pix_key: pix_key.trim(),
            pix_key_type,
            merchant_name: merchant_name.trim(),
            merchant_city: merchant_city.trim(),
          },
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key',
        });

      if (upsertError) {
        console.error('Error saving PIX settings:', upsertError);
        return new Response(
          JSON.stringify({ error: 'Erro ao salvar configurações PIX' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Configurações PIX salvas com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: get_pix - Get PIX settings for admin
    if (action === 'get_pix') {
      const { data: pixSettings, error } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'pix_settings')
        .maybeSingle();

      if (error) {
        console.error('Error fetching PIX settings:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar configurações PIX' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ settings: pixSettings?.value || null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro inesperado' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
