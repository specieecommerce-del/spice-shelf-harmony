import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NutritionRequest {
  method: "database" | "ocr" | "calculate";
  productName?: string;
  productCategory?: string;
  labelImageBase64?: string;
  ingredients?: Array<{ name: string; quantity: number; unit: string }>;
  portionSize?: number;
}

interface NutritionalInfo {
  calories: number;
  carbohydrates: number;
  proteins: number;
  total_fat: number;
  saturated_fat: number;
  trans_fat: number;
  fiber: number;
  sodium: number;
  portion_size: string;
  disclaimer: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: NutritionRequest = await req.json();
    const { method, productName, productCategory, labelImageBase64, ingredients, portionSize } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Configuração de IA não encontrada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = "";
    let userContent: any[] = [];

    if (method === "database") {
      // Method 1: Database lookup (TACO/USDA)
      systemPrompt = `Você é um especialista em nutrição com acesso a dados da Tabela TACO (Brasil) e USDA.
Analise o produto informado e retorne informações nutricionais precisas baseadas em dados científicos.

IMPORTANTE: Use dados reais de tabelas nutricionais reconhecidas. Se não encontrar dados exatos, use a categoria mais próxima.

Retorne APENAS um JSON válido no formato:
{
  "calories": number (kcal por 100g),
  "carbohydrates": number (g por 100g),
  "proteins": number (g por 100g),
  "total_fat": number (g por 100g),
  "saturated_fat": number (g por 100g),
  "trans_fat": number (g por 100g),
  "fiber": number (g por 100g),
  "sodium": number (mg por 100g),
  "portion_size": "100g",
  "source": "TACO" ou "USDA",
  "confidence": "alta", "média" ou "baixa",
  "disclaimer": "Informações nutricionais geradas automaticamente baseadas em dados de ${new Date().getFullYear()}. Devem ser validadas pelo fabricante."
}`;

      userContent = [
        { type: "text", text: `Produto: ${productName}\nCategoria: ${productCategory || "Alimento"}\n\nForneça as informações nutricionais baseadas na Tabela TACO ou USDA.` }
      ];

    } else if (method === "ocr") {
      // Method 2: OCR from label
      if (!labelImageBase64) {
        return new Response(
          JSON.stringify({ error: "Imagem do rótulo é obrigatória para método OCR" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      systemPrompt = `Você é um especialista em leitura de rótulos nutricionais seguindo padrão ANVISA.
Analise a imagem do rótulo e extraia TODAS as informações nutricionais visíveis.

IMPORTANTE: Extraia os dados EXATAMENTE como aparecem no rótulo. Não invente valores.

Retorne APENAS um JSON válido no formato:
{
  "calories": number (kcal),
  "carbohydrates": number (g),
  "proteins": number (g),
  "total_fat": number (g),
  "saturated_fat": number (g),
  "trans_fat": number (g),
  "fiber": number (g),
  "sodium": number (mg),
  "portion_size": "porção conforme rótulo (ex: 30g, 1 unidade 25g)",
  "additional_info": { ... outros nutrientes encontrados ... },
  "disclaimer": "Informações extraídas automaticamente do rótulo. Verifique os dados com o produto físico."
}

Se algum valor não estiver visível, use null.`;

      userContent = [
        { type: "text", text: "Extraia as informações nutricionais deste rótulo:" },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${labelImageBase64}` } }
      ];

    } else if (method === "calculate") {
      // Method 3: Calculate from ingredients
      if (!ingredients || ingredients.length === 0) {
        return new Response(
          JSON.stringify({ error: "Lista de ingredientes é obrigatória para cálculo" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ingredientsList = ingredients.map(i => `- ${i.name}: ${i.quantity}${i.unit}`).join("\n");
      const portion = portionSize || 100;

      systemPrompt = `Você é um nutricionista especializado em cálculo de valores nutricionais.
Calcule os valores nutricionais baseados nos ingredientes fornecidos.

Use dados da Tabela TACO/USDA para cada ingrediente e some os valores proporcionalmente.

Retorne APENAS um JSON válido no formato:
{
  "calories": number (kcal por porção),
  "carbohydrates": number (g por porção),
  "proteins": number (g por porção),
  "total_fat": number (g por porção),
  "saturated_fat": number (g por porção),
  "trans_fat": number (g por porção),
  "fiber": number (g por porção),
  "sodium": number (mg por porção),
  "portion_size": "${portion}g",
  "calculation_details": { ... detalhamento por ingrediente ... },
  "disclaimer": "Valores calculados automaticamente com base nos ingredientes informados. Podem variar conforme método de preparo e marcas utilizadas. Devem ser validados por profissional de nutrição."
}`;

      userContent = [
        { type: "text", text: `Calcule os valores nutricionais para uma porção de ${portion}g:\n\nIngredientes:\n${ingredientsList}` }
      ];

    } else {
      return new Response(
        JSON.stringify({ error: "Método inválido. Use: database, ocr ou calculate" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing nutrition request with method: ${method}`);

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
          { role: "user", content: userContent }
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
        JSON.stringify({ error: "Erro ao processar informações nutricionais" }),
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

    // Parse JSON from response
    let nutritionData;
    try {
      const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
      nutritionData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Erro ao processar resposta da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Nutrition data generated successfully using method: ${method}`);

    return new Response(
      JSON.stringify({ method, data: nutritionData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-nutrition-generator:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
