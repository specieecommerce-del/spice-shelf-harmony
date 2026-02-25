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

    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
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
      const v = boletoSettings?.value as Record<string, unknown> | undefined;
      if (v) {
        const enabled = Boolean(v['enabled']);
        const mode = String(v['mode'] || 'manual') as 'manual' | 'registered';
        const days_to_expire = Number(v['days_to_expire'] ?? 3);
        const instructions = String(v['instructions'] ?? '');
        const environment = typeof v['environment'] === 'string'
          ? String(v['environment'])
          : ((v['sandbox'] ? 'sandbox' : 'production'));
        const registered = (v['registered'] ?? {}) as Record<string, unknown>;
        const manual = (v['manual'] ?? {}) as Record<string, unknown>;
        const configured =
          enabled &&
          (mode === 'manual'
            ? Boolean(manual['bank_code'] && manual['beneficiary_name'] && manual['beneficiary_document'])
            : Boolean((registered['bank'] as Record<string, unknown> | undefined)?.['code']));
        if (!configured) {
          return new Response(
            JSON.stringify({ error: 'Boleto não configurado', configured: false }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (mode === 'manual') {
          return new Response(
            JSON.stringify({
              configured: true,
              bank_code: String(manual['bank_code'] || ''),
              bank_name: String(manual['bank_name'] || ''),
              agency: String(manual['agency'] || ''),
              account: String(manual['account'] || ''),
              account_type: String(manual['account_type'] || 'corrente'),
              beneficiary_name: String(manual['beneficiary_name'] || ''),
              beneficiary_document: String(manual['beneficiary_document'] || ''),
              instructions,
              days_to_expire,
              mode,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          const bank = (registered['bank'] ?? {}) as Record<string, unknown>;
          return new Response(
            JSON.stringify({
              configured: true,
              mode,
              provider: String(v['provider'] || ''),
              environment,
              instructions,
              days_to_expire,
              bank_code: String(bank['code'] || ''),
              bank_name: String(bank['name'] || ''),
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      if (!boletoSettings?.value) {
        // Fallback: check legacy/admin stored registered settings
        const { data: regSettings } = await supabase
          .from('store_settings')
          .select('value')
          .eq('key', 'boleto_registered_settings')
          .maybeSingle();
        const rv = regSettings?.value as Record<string, unknown> | undefined;
        if (rv && String(rv['mode'] || '') === 'registered') {
          const enabled = Boolean(rv['enabled'] ?? true);
          const bank = (rv['bank'] ?? {}) as Record<string, unknown>;
          const configured = enabled && Boolean(String(bank['code'] || '').trim());
          const days_to_expire = Number(((rv['billing'] as Record<string, unknown> | undefined)?.['days_to_expire'] ?? 3));
          const instructions = String(((rv['billing'] as Record<string, unknown> | undefined)?.['instructions'] ?? ''));
          const environment = String(((rv['api'] as Record<string, unknown> | undefined)?.['environment'] ?? 'homolog')) === 'homolog'
            ? 'sandbox' : 'production';
          if (configured) {
            return new Response(
              JSON.stringify({
                configured: true,
                mode: 'registered',
                provider: String(rv['provider'] || ''),
                environment,
                instructions,
                days_to_expire,
                bank_code: String(bank['code'] || ''),
                bank_name: String(bank['name'] || ''),
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        return new Response(
          JSON.stringify({ error: 'Boleto não configurado', configured: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const v2 = boletoSettings.value as Record<string, unknown>;
      // Backward compatibility: support flat schema and new schema
      const isNewSchema = typeof v2?.['mode'] === 'string' || v2?.['manual'] || v2?.['enabled'] !== undefined;
      if (isNewSchema) {
        const enabled = Boolean(v2['enabled']);
        const mode = String(v2['mode'] || 'manual') as 'manual' | 'registered';
        const days_to_expire = Number(v2['days_to_expire'] ?? 3);
        const instructions = String(v2['instructions'] ?? '');
        const manual = (v2['manual'] ?? {}) as Record<string, unknown>;
        const configured =
          enabled &&
          (mode === 'manual'
            ? Boolean(manual['bank_code'] && manual['beneficiary_name'] && manual['beneficiary_document'])
            : true);

        if (!configured) {
          return new Response(
            JSON.stringify({ error: 'Boleto não configurado', configured: false }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (mode === 'manual') {
          return new Response(
            JSON.stringify({
              configured: true,
              bank_code: String(manual['bank_code'] || ''),
              bank_name: String(manual['bank_name'] || ''),
              agency: String(manual['agency'] || ''),
              account: String(manual['account'] || ''),
              account_type: String(manual['account_type'] || 'corrente'),
              beneficiary_name: String(manual['beneficiary_name'] || ''),
              beneficiary_document: String(manual['beneficiary_document'] || ''),
              instructions,
              days_to_expire,
              mode,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Registered mode: for now expose configured flag and basics; provider integration will use this
          const registered = (v2['registered'] ?? {}) as Record<string, unknown>;
          return new Response(
            JSON.stringify({
              configured: true,
              mode,
              provider: String(registered['provider'] || v2['provider'] || ''),
              environment: String(v2['environment'] ?? 'sandbox'),
              instructions,
              days_to_expire,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Legacy flat schema
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
      // Support both legacy flat payload and new structured payload
      const mode = body?.mode as 'manual' | 'registered' | undefined;
      let valueToSave: Record<string, unknown>;

      if (mode) {
        const enabled = body?.enabled ?? true;
        const provider = body?.provider ?? (body?.registered?.provider ?? 'bank_direct');
        const days_to_expire = body?.days_to_expire ?? 3;
        const instructions = (body?.instructions ?? '').trim();
        const manual = (body?.manual ?? {}) as Record<string, unknown>;
        const registered = (body?.registered ?? {}) as Record<string, unknown>;

        // If manual mode, validate minimal fields
        if (mode === 'manual') {
          const required = [
            manual['bank_code'],
            manual['bank_name'],
            manual['agency'],
            manual['account'],
            manual['beneficiary_name'],
            manual['beneficiary_document'],
          ];
          if (required.some((x: unknown) => !x || String(x).trim() === '')) {
            return new Response(
              JSON.stringify({ error: 'Campos obrigatórios não preenchidos' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        if (mode === 'registered') {
          const bank = (registered['bank'] ?? {}) as Record<string, unknown>;
          valueToSave = {
            enabled: Boolean(enabled),
            mode: 'registered',
            provider: String(provider),
            environment: String(body?.environment ?? 'sandbox'),
            days_to_expire: Number(days_to_expire),
            instructions,
            registered: {
              bank: {
                code: String((bank as Record<string, unknown>)['code'] ?? '').trim(),
                name: String((bank as Record<string, unknown>)['name'] ?? '').trim(),
              },
              agency: String(registered['agency'] ?? '').trim(),
              account: String(registered['account'] ?? '').trim(),
              account_digit: String(registered['account_digit'] ?? '').trim(),
              wallet: String(registered['wallet'] ?? '').trim(),
              convenio: String(registered['convenio'] ?? '').trim(),
              cedent_code: String(registered['cedent_code'] ?? '').trim(),
              beneficiary_document: String(registered['beneficiary_document'] ?? '').trim(),
              beneficiary_name: String(registered['beneficiary_name'] ?? '').trim(),
              interest_percent: Number(((registered as Record<string, unknown>)['interest_percent'] ?? (registered as Record<string, unknown>)['interest_monthly_percent'] ?? 0) as number),
              fine_percent: Number(registered.fine_percent ?? 0),
              webhook_secret: String(registered.webhook_secret ?? '').trim(),
              credentials: (registered['credentials'] ?? {}) as Record<string, unknown>,
            },
            manual: {
              bank_code: String(manual['bank_code'] ?? '').trim(),
              bank_name: String(manual['bank_name'] ?? '').trim(),
              agency: String(manual['agency'] ?? '').trim(),
              account: String(manual['account'] ?? '').trim(),
              account_type: String(manual['account_type'] ?? 'corrente'),
              beneficiary_name: String(manual['beneficiary_name'] ?? '').trim(),
              beneficiary_document: String(manual['beneficiary_document'] ?? '').trim(),
            },
          };
        } else {
          valueToSave = {
            enabled: Boolean(enabled),
            mode: 'manual',
            provider: String(provider),
            environment: String(body?.environment ?? 'sandbox'),
            days_to_expire: Number(days_to_expire),
            instructions,
            manual: {
              bank_code: String(manual.bank_code ?? '').trim(),
              bank_name: String(manual.bank_name ?? '').trim(),
              agency: String(manual.agency ?? '').trim(),
              account: String(manual.account ?? '').trim(),
              account_type: String(manual.account_type ?? 'corrente'),
              beneficiary_name: String(manual.beneficiary_name ?? '').trim(),
              beneficiary_document: String(manual.beneficiary_document ?? '').trim(),
            },
            registered: {
              bank: { code: '', name: '' },
              agency: '',
              account: '',
              account_digit: '',
              wallet: '',
              convenio: '',
              cedent_code: '',
              beneficiary_document: '',
              beneficiary_name: '',
              interest_percent: 0,
              fine_percent: 0,
              webhook_secret: '',
              credentials: {},
            },
          };
        }
      } else {
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

        console.log('Saving boleto settings (legacy) for admin:', user.id);
        valueToSave = {
          enabled: true,
          mode: 'manual',
          provider: 'bank',
          environment: 'sandbox',
          days_to_expire: days_to_expire || 3,
          instructions: instructions?.trim() || '',
          manual: {
            bank_code: String(bank_code).trim(),
            bank_name: String(bank_name).trim(),
            agency: String(agency).trim(),
            account: String(account).trim(),
            account_type: String(account_type || 'corrente'),
            beneficiary_name: String(beneficiary_name).trim(),
            beneficiary_document: String(beneficiary_document).trim(),
          },
          registered: {
            provider: '',
            webhook_secret: '',
          },
        };
      }

      const { error: upsertError } = await supabase
        .from('store_settings')
        .upsert({
          key: 'boleto_settings',
          value: valueToSave,
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

    if (action === 'set_enabled') {
      const enabled = Boolean(body?.enabled ?? true);
      const { data: existing } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'boleto_settings')
        .maybeSingle();
      const cur = (existing?.value ?? {}) as Record<string, unknown>;
      const newVal = { ...cur, enabled };
      const { error: upsertErr } = await supabase
        .from('store_settings')
        .upsert({
          key: 'boleto_settings',
          value: newVal,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });
      if (upsertErr) {
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar status do boleto' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: true }),
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
