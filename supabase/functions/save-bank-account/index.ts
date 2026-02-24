import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept, prefer",
};

interface BankAccountData {
  bank_code: string;
  bank_name: string;
  agency: string;
  account_number: string;
  account_type: string;
  holder_name: string;
  holder_document: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: (req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "") },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Não autorizado. Faça login para continuar." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("User is not admin:", roleError);
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem configurar a conta bancária." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bankData: BankAccountData = await req.json();
    console.log("Received bank data for admin user:", user.id);

    // Validate required fields
    if (!bankData.bank_code || !bankData.agency || !bankData.account_number || 
        !bankData.holder_name || !bankData.holder_document) {
      return new Response(
        JSON.stringify({ error: "Todos os campos são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Save bank account settings to store_settings table
    const bankAccountSettings = {
      bank_code: bankData.bank_code,
      bank_name: bankData.bank_name,
      agency: bankData.agency.replace(/\D/g, ""),
      account_number: bankData.account_number,
      account_type: bankData.account_type,
      holder_name: bankData.holder_name,
      holder_document: bankData.holder_document.replace(/\D/g, ""),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    // Upsert the bank account settings
    const { error: upsertError } = await supabaseAdmin
      .from("store_settings")
      .upsert(
        {
          key: "bank_account",
          value: bankAccountSettings,
        },
        { onConflict: "key" }
      );

    if (upsertError) {
      console.error("Error saving bank account:", upsertError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar dados da conta bancária." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Bank account saved successfully for admin:", user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Conta bancária salva com sucesso! Configure os recebimentos no painel da InfinitePay.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro interno do servidor";
    console.error("Error in save-bank-account function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
