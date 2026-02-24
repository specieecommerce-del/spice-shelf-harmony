import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, prefer',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const action = body?.action;

    if (action === 'get_config') {
      const { data } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'boleto_settings')
        .maybeSingle();
      const v = (data?.value || null) as Record<string, any> | null;
      if (!v) {
        return new Response(JSON.stringify({ settings: null }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const redacted = JSON.parse(JSON.stringify(v));
      if (redacted?.registered?.provider === 'bank') {
        const bank = redacted.registered.bank || {};
        const secretsPresent = {
          cert_pem: Boolean(bank?.cert_pem),
          key_pem: Boolean(bank?.key_pem),
          webhook_secret: Boolean(redacted.registered?.webhook_secret),
        };
        if (bank) {
          delete bank.cert_pem;
          delete bank.key_pem;
          redacted.registered.bank = bank;
        }
        redacted.registered.secrets_present = secretsPresent;
      } else {
        const secretsPresent = {
          api_token: Boolean(redacted.registered?.api_token),
          client_secret: Boolean(redacted.registered?.client_secret),
          webhook_secret: Boolean(redacted.registered?.webhook_secret),
        };
        delete redacted.registered?.api_token;
        delete redacted.registered?.client_secret;
        redacted.registered = { ...redacted.registered, secrets_present: secretsPresent };
      }
      return new Response(JSON.stringify({ settings: redacted }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'save_config') {
      const valueToSave = body?.value;
      if (!valueToSave) {
        return new Response(JSON.stringify({ error: 'Payload inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      await supabase
        .from('store_settings')
        .upsert({
          key: 'boleto_settings',
          value: valueToSave,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'get_registered_config') {
      const { data } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'boleto_registered_settings')
        .maybeSingle();
      const v = (data?.value || null) as Record<string, any> | null;
      if (!v) {
        return new Response(JSON.stringify({ settings: null }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const redacted = JSON.parse(JSON.stringify(v));
      if (redacted?.api) {
        const secretsPresent = {
          client_secret: Boolean(redacted.api?.client_secret),
        };
        delete redacted.api.client_secret;
        redacted.api.secrets_present = secretsPresent;
      }
      return new Response(JSON.stringify({ settings: redacted }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'save_registered_config') {
      const valueToSave = body?.value;
      if (!valueToSave) {
        return new Response(JSON.stringify({ error: 'Payload inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      await supabase
        .from('store_settings')
        .upsert({
          key: 'boleto_registered_settings',
          value: valueToSave,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'test_credentials') {
      const provider = body?.provider || '';
      const settings = body?.settings || {};
      const sandbox = Boolean(settings?.registered?.sandbox ?? true);
      // For now, only structure validation
      const ok = Boolean(provider);
      return new Response(JSON.stringify({ success: ok, sandbox }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('admin-boleto-settings error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

