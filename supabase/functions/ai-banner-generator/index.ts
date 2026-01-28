import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { images, prompt, style } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: "No images provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the prompt for AI
    const styleDescriptions: Record<string, string> = {
      modern: "modern, clean design with vibrant colors and minimalist typography",
      classic: "elegant, timeless design with refined fonts and warm tones",
      minimal: "ultra-minimal with focus on the image, subtle text overlay",
      bold: "bold, impactful design with strong colors and large typography",
    };

    const systemPrompt = `You are a professional marketing banner designer. Analyze the provided images and create promotional banner text suggestions in Portuguese (Brazil).

For each image, generate:
1. A compelling title (max 5 words)
2. A subtitle/description (max 10 words)
3. A call-to-action button text (2-3 words)
4. A relevant link path (e.g., /promocoes, /produtos, /novidades)

The style should be: ${styleDescriptions[style] || styleDescriptions.modern}

${prompt ? `Context/Theme: ${prompt}` : "Create generic promotional content suitable for an e-commerce store selling spices, herbs, and gourmet products."}

Respond in JSON format only:
{
  "banners": [
    {
      "title": "...",
      "subtitle": "...",
      "button_text": "...",
      "link_url": "...",
      "image_index": 0
    }
  ]
}`;

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
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please analyze these ${images.length} images and create banner text suggestions for each. Create up to 5 banners from the best images.`,
              },
              ...images.slice(0, 5).map((url: string) => ({
                type: "image_url",
                image_url: { url },
              })),
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      // Return fallback banners
      const fallbackBanners = images.slice(0, 5).map((url: string, index: number) => ({
        id: crypto.randomUUID(),
        title: prompt ? prompt.split(" ").slice(0, 4).join(" ") : `Destaque ${index + 1}`,
        subtitle: "Confira nossas ofertas especiais",
        image_url: url,
        button_text: "Ver Mais",
        link_url: "/produtos",
        style: style || "modern",
      }));

      return new Response(
        JSON.stringify({ banners: fallbackBanners }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse AI response
    let parsedBanners;
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedBanners = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
    }

    // Build final banners array
    const finalBanners = [];
    
    if (parsedBanners?.banners && Array.isArray(parsedBanners.banners)) {
      for (const banner of parsedBanners.banners) {
        const idx: number = typeof banner.image_index === "number" ? banner.image_index : finalBanners.length;
        const imgUrl: string = images[idx] || images[finalBanners.length] || images[0];
        
        finalBanners.push({
          id: crypto.randomUUID(),
          title: banner.title || `Destaque ${finalBanners.length + 1}`,
          subtitle: banner.subtitle || "Confira nossas ofertas",
          image_url: imgUrl,
          button_text: banner.button_text || "Ver Mais",
          link_url: banner.link_url || "/produtos",
          style: style || "modern",
        });
      }
    }

    // Fallback if no banners generated
    if (finalBanners.length === 0) {
      for (let i = 0; i < Math.min(images.length, 5); i++) {
        finalBanners.push({
          id: crypto.randomUUID(),
          title: `Destaque ${i + 1}`,
          subtitle: prompt || "Produtos selecionados para você",
          image_url: images[i],
          button_text: "Saiba Mais",
          link_url: "/produtos",
          style: style || "modern",
        });
      }
    }

    return new Response(
      JSON.stringify({ banners: finalBanners }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-banner-generator:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
