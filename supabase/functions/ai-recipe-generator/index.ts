import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateRecipeImage(lovableApiKey: string, recipeTitle: string, ingredients: string[]): Promise<string | null> {
  try {
    const prompt = `Professional food photography of a delicious dish called "${recipeTitle}". 
The dish features ingredients like ${ingredients.slice(0, 5).join(', ')}. 
Style: appetizing, warm lighting, rustic table setting, garnished beautifully, restaurant quality presentation.
Ultra high resolution, 16:9 aspect ratio hero image.`;

    console.log('Generating image for recipe:', recipeTitle);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      console.error('Image generation failed:', response.status);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (imageUrl) {
      console.log('Image generated successfully');
      return imageUrl;
    }
    
    return null;
  } catch (error) {
    console.error('Error generating image:', error);
    return null;
  }
}

async function uploadImageToStorage(supabase: any, base64Image: string, recipeTitle: string): Promise<string | null> {
  try {
    // Remove data:image prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imageBytes = decode(base64Data);
    
    const fileName = `recipe-${Date.now()}-${recipeTitle.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}.png`;
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(`recipes/${fileName}`, imageBytes, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: publicUrl } = supabase.storage
      .from('product-images')
      .getPublicUrl(`recipes/${fileName}`);

    return publicUrl.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, recipeId, prompt, variation, generateImage = true } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all active products for ingredient matching
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, stock_quantity, image_url, category, description')
      .eq('is_active', true);

    if (productsError) {
      throw new Error(`Erro ao buscar produtos: ${productsError.message}`);
    }

    const productList = products?.map(p => `- ${p.name} (R$ ${p.price}, estoque: ${p.stock_quantity})`).join('\n') || '';
    const productNames = products?.map(p => p.name).join(', ') || '';

    // Fetch recipe categories
    const { data: categories } = await supabase
      .from('product_categories')
      .select('name')
      .eq('is_active', true);

    const categoryList = categories?.map(c => c.name).join(', ') || 'temperos, ervas, especiarias';

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'generate') {
      systemPrompt = `Você é um chef especialista em criar receitas deliciosas usando temperos e especiarias de alta qualidade.
Sua tarefa é criar receitas que:
1. Utilizem OBRIGATORIAMENTE produtos disponíveis no catálogo da loja
2. Sejam atrativas para aumentar as vendas
3. Tenham instruções claras e fáceis de seguir

PRODUTOS DISPONÍVEIS NA LOJA (use APENAS estes):
${productList}

CLASSIFICAÇÃO AUTOMÁTICA DE REFEIÇÃO:
Analise os ingredientes e características da receita para classificar automaticamente:

REGRAS DE CLASSIFICAÇÃO:
- "breakfast" (Café da manhã): receitas leves, com frutas, pães, ovos, leite, café, cereais, granola
- "lunch" (Almoço): receitas mais substanciais com arroz, feijão, carnes, frango, massas, saladas completas
- "dinner" (Jantar): sopas, massas leves, legumes, caldos, pratos mais leves que almoço

EXEMPLOS:
- Pão com especiarias + ovo = breakfast
- Frango grelhado com arroz = lunch
- Sopa de legumes com temperos = dinner
- Vitamina com especiarias = breakfast
- Bife com batatas = lunch
- Massa leve com ervas = dinner

RESPONDA APENAS EM JSON válido, sem markdown, sem explicações, seguindo exatamente esta estrutura:
{
  "title": "Nome atrativo da receita",
  "description": "Descrição curta e vendedora (max 150 caracteres)",
  "benefits": "Benefícios de saúde dos ingredientes",
  "category": "breakfast|lunch|dinner",
  "recipe_category": "fitness|caseira|gourmet|vegana|rapida|economica|premium|saudavel",
  "prep_time": "tempo em minutos (ex: 30 min)",
  "difficulty": "Fácil|Médio|Difícil",
  "ingredients": ["ingrediente 1 com quantidade", "ingrediente 2 com quantidade"],
  "preparation": ["passo 1", "passo 2", "passo 3"],
  "spices": ["nome exato do produto da loja 1", "nome exato do produto da loja 2"],
  "nutritional_info": {
    "calories": "aproximado por porção",
    "protein": "em gramas",
    "carbs": "em gramas",
    "fat": "em gramas",
    "fiber": "em gramas"
  },
  "tips": ["dica 1", "dica 2"]
}`;

      userPrompt = prompt || `Crie uma receita deliciosa e saudável que use os temperos: ${productNames.substring(0, 200)}. A receita deve ser fácil de fazer e destacar os benefícios dos temperos. CLASSIFIQUE AUTOMATICAMENTE como café da manhã, almoço ou jantar baseado nos ingredientes.`;
    
    } else if (action === 'variation') {
      // Fetch existing recipe
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single();

      if (recipeError || !recipe) {
        throw new Error('Receita não encontrada');
      }

      systemPrompt = `Você é um chef especialista. Sua tarefa é criar uma VARIAÇÃO de uma receita existente.

RECEITA ORIGINAL:
Título: ${recipe.title}
Ingredientes: ${recipe.ingredients?.join(', ')}
Preparo: ${recipe.preparation?.join('. ')}
Temperos: ${recipe.spices?.join(', ')}

PRODUTOS DISPONÍVEIS NA LOJA:
${productList}

Crie uma variação ${variation || 'premium'} da receita.
- economica: ingredientes mais baratos, mesma qualidade
- premium: ingredientes sofisticados, apresentação elegante
- saudavel: menos calorias, mais nutrientes, opções integrais

RESPONDA APENAS EM JSON válido, seguindo a mesma estrutura da receita original.`;

      userPrompt = `Crie a versão ${variation || 'premium'} desta receita, mantendo a essência mas adaptando para o perfil solicitado.`;
    
    } else if (action === 'suggest_substitutes') {
      // Check stock and suggest substitutes
      const { data: recipeProducts, error: rpError } = await supabase
        .from('recipe_products')
        .select(`
          *,
          product:products(id, name, stock_quantity, price)
        `)
        .eq('recipe_id', recipeId);

      if (rpError) throw new Error(rpError.message);

      const outOfStock = recipeProducts?.filter(rp => rp.product?.stock_quantity === 0) || [];
      
      if (outOfStock.length === 0) {
        return new Response(
          JSON.stringify({ message: 'Todos os produtos estão em estoque', substitutes: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const outOfStockNames = outOfStock.map(o => o.product?.name).join(', ');

      systemPrompt = `Você é um especialista em temperos e substituições culinárias.

PRODUTOS SEM ESTOQUE: ${outOfStockNames}

PRODUTOS DISPONÍVEIS COM ESTOQUE:
${products?.filter(p => p.stock_quantity > 0).map(p => `- ${p.name}`).join('\n')}

Sugira substitutos adequados para cada produto sem estoque.
RESPONDA EM JSON: { "substitutes": [{ "original": "nome original", "substitute": "nome do substituto", "reason": "razão da substituição" }] }`;

      userPrompt = 'Sugira os melhores substitutos disponíveis.';
    }

    // Call Lovable AI Gateway for recipe content
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', errorText);
      
      if (aiResponse.status === 429 || aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente mais tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Erro na API de IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    // Parse JSON response
    let parsedContent;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedContent = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Parse error:', parseError, 'Content:', content);
      throw new Error('Erro ao processar resposta da IA');
    }

    // Match spices to actual products
    if (parsedContent.spices && action === 'generate') {
      const matchedProducts = [];
      for (const spice of parsedContent.spices) {
        const found = products?.find(p => 
          p.name.toLowerCase().includes(spice.toLowerCase()) ||
          spice.toLowerCase().includes(p.name.toLowerCase())
        );
        if (found) {
          matchedProducts.push({
            product_id: found.id,
            product_name: found.name,
            price: found.price,
            stock_quantity: found.stock_quantity,
            image_url: found.image_url,
            in_stock: found.stock_quantity > 0
          });
        }
      }
      parsedContent.matched_products = matchedProducts;
    }

    // Generate image for the recipe if requested and it's a new recipe
    if (action === 'generate' && generateImage && parsedContent.title) {
      console.log('Generating image for recipe...');
      const base64Image = await generateRecipeImage(
        lovableApiKey, 
        parsedContent.title, 
        parsedContent.ingredients || []
      );
      
      if (base64Image) {
        // Upload to storage and get public URL
        const publicUrl = await uploadImageToStorage(supabase, base64Image, parsedContent.title);
        if (publicUrl) {
          parsedContent.image_url = publicUrl;
          console.log('Image uploaded:', publicUrl);
        } else {
          // Fallback: use base64 directly (not ideal for storage)
          parsedContent.image_url = base64Image;
        }
      }
    }

    return new Response(
      JSON.stringify(parsedContent),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
