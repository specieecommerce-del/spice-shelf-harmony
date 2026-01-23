import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, imageBase64 } = await req.json();
    
    if (!imageUrl && !imageBase64) {
      return new Response(
        JSON.stringify({ error: "Uma imagem é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Configuração de IA não encontrada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch categories from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: categories } = await supabase
      .from("product_categories")
      .select("slug, name")
      .eq("is_active", true);

    const categoryList = categories?.map(c => `${c.slug}: ${c.name}`).join(", ") || "temperos, condimentos, ervas, especiarias";

    const systemPrompt = `Você é um especialista em produtos alimentícios, especialmente temperos e especiarias.
Analise a imagem do produto e forneça as seguintes informações em formato JSON:

{
  "name": "Nome do produto (curto e comercial)",
  "description": "Descrição curta de 1-2 frases para exibição no catálogo",
  "long_description": "Descrição detalhada de 3-4 parágrafos sobre o produto, origem, usos culinários e benefícios",
  "category": "categoria mais adequada dentre: ${categoryList}",
  "badges": ["array de badges como: Orgânico, Sem Glúten, Vegano, Premium, Artesanal"],
  "suggested_price": "preço sugerido em centavos (número inteiro)",
  "nutritional_highlights": ["benefícios nutricionais principais"],
  "usage_tips": ["dicas de uso culinário"]
}

Responda APENAS com o JSON, sem markdown ou explicações.`;

    // Prepare content based on image type
    let imageContent: { type: string; image_url?: { url: string }; text?: string }[];
    
    if (imageBase64) {
      imageContent = [
        { type: "text", text: "Analise esta imagem de produto e gere as informações:" },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      ];
    } else {
      imageContent = [
        { type: "text", text: "Analise esta imagem de produto e gere as informações:" },
        { type: "image_url", image_url: { url: imageUrl } }
      ];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: imageContent }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao analisar imagem" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Resposta da IA vazia" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON from response (remove markdown if present)
    let productData;
    try {
      const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
      productData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Erro ao processar resposta da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Product analyzed successfully:", productData.name);

    return new Response(
      JSON.stringify(productData),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-product-analyzer:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
