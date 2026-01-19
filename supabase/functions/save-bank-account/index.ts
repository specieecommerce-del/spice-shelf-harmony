import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
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

    const bankData: BankAccountData = await req.json();
    console.log("Received bank data for user:", user.id);

    // Validate required fields
    if (!bankData.bank_code || !bankData.agency || !bankData.account_number || 
        !bankData.holder_name || !bankData.holder_document) {
      return new Response(
        JSON.stringify({ error: "Todos os campos são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("INFINITEPAY_API_KEY");
    
    if (!apiKey) {
      console.error("INFINITEPAY_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Configuração de API ausente. Contate o administrador." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call InfinitePay API to register/update bank account
    const infinitePayResponse = await fetch("https://api.infinitepay.io/v2/merchants/bank_accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        bank_code: bankData.bank_code,
        agency: bankData.agency.replace(/\D/g, ""),
        account: bankData.account_number.replace(/\D/g, ""),
        account_type: bankData.account_type === "corrente" ? "checking" : "savings",
        holder: {
          name: bankData.holder_name,
          document: bankData.holder_document.replace(/\D/g, ""),
        },
      }),
    });

    const responseText = await infinitePayResponse.text();
    console.log("InfinitePay response status:", infinitePayResponse.status);
    console.log("InfinitePay response:", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { message: responseText };
    }

    if (!infinitePayResponse.ok) {
      const errorMessage = responseData.message || responseData.error || "Erro ao salvar conta bancária na InfinitePay";
      console.error("InfinitePay error:", errorMessage);
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: infinitePayResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Bank account saved successfully for user:", user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Conta bancária vinculada com sucesso!",
        data: responseData 
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
