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

    const authHeader = req.headers.get('authorization');
    const body = await req.json();
    const { action } = body;

    // Action: get_boleto_for_payment - Public endpoint to get boleto data for checkout
    if (action === 'get_boleto_for_payment') {
      console.log('Fetching boleto settings for payment...');
      
      const { data: boletoSettings, error } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'boleto_settings')
        .maybeSingle();

      if (error) {
        console.error('Error fetching boleto settings:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar configurações de boleto' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!boletoSettings?.value) {
        return new Response(
          JSON.stringify({ error: 'Boleto não configurado', configured: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const settings = boletoSettings.value as {
        bank_code: string;
        bank_name: string;
        agency: string;
        account: string;
        account_type: string;
        beneficiary_name: string;
        beneficiary_document: string;
        instructions: string;
        days_to_expire: number;
      };

      return new Response(
        JSON.stringify({
          configured: true,
          ...settings,
        }),
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

    // Action: save_boleto - Save boleto settings
    if (action === 'save_boleto') {
      const { 
        bank_code, 
        bank_name, 
        agency, 
        account, 
        account_type,
        beneficiary_name, 
        beneficiary_document,
        instructions,
        days_to_expire 
      } = body;

      if (!bank_code || !bank_name || !agency || !account || !beneficiary_name || !beneficiary_document) {
        return new Response(
          JSON.stringify({ error: 'Campos obrigatórios não preenchidos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Saving boleto settings for admin:', user.id);

      const { error: upsertError } = await supabase
        .from('store_settings')
        .upsert({
          key: 'boleto_settings',
          value: {
            bank_code: bank_code.trim(),
            bank_name: bank_name.trim(),
            agency: agency.trim(),
            account: account.trim(),
            account_type: account_type || 'corrente',
            beneficiary_name: beneficiary_name.trim(),
            beneficiary_document: beneficiary_document.trim(),
            instructions: instructions?.trim() || '',
            days_to_expire: days_to_expire || 3,
          },
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key',
        });

      if (upsertError) {
        console.error('Error saving boleto settings:', upsertError);
        return new Response(
          JSON.stringify({ error: 'Erro ao salvar configurações de boleto' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Configurações de boleto salvas com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: get_boleto - Get boleto settings for admin
    if (action === 'get_boleto') {
      const { data: boletoSettings, error } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'boleto_settings')
        .maybeSingle();

      if (error) {
        console.error('Error fetching boleto settings:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar configurações de boleto' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ settings: boletoSettings?.value || null }),
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
