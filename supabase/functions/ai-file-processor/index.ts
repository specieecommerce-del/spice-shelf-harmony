import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FileProcessRequest {
  fileBase64: string;
  fileType: string; // image/jpeg, image/png, video/mp4, application/pdf
  fileName: string;
  targetPlatforms: string[]; // ["instagram_feed", "instagram_stories", "facebook", "google_ads", "marketplace"]
}

interface ProcessedOutput {
  platform: string;
  dimensions: { width: number; height: number };
  aspectRatio: string;
  recommendations: string[];
}

const PLATFORM_SPECS: Record<string, { width: number; height: number; aspectRatio: string; name: string }> = {
  instagram_feed: { width: 1080, height: 1080, aspectRatio: "1:1", name: "Instagram Feed" },
  instagram_stories: { width: 1080, height: 1920, aspectRatio: "9:16", name: "Instagram Stories/Reels" },
  instagram_reels: { width: 1080, height: 1920, aspectRatio: "9:16", name: "Instagram Reels" },
  facebook_feed: { width: 1200, height: 630, aspectRatio: "1.91:1", name: "Facebook Feed" },
  facebook_ads: { width: 1200, height: 628, aspectRatio: "1.91:1", name: "Facebook Ads" },
  google_ads_display: { width: 1200, height: 628, aspectRatio: "1.91:1", name: "Google Display Ads" },
  google_ads_square: { width: 1200, height: 1200, aspectRatio: "1:1", name: "Google Ads Quadrado" },
  marketplace: { width: 1000, height: 1000, aspectRatio: "1:1", name: "Marketplace" },
  whatsapp_status: { width: 1080, height: 1920, aspectRatio: "9:16", name: "WhatsApp Status" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: FileProcessRequest = await req.json();
    const { fileBase64, fileType, fileName, targetPlatforms } = body;

    if (!fileBase64 || !fileType) {
      return new Response(
        JSON.stringify({ error: "Arquivo e tipo são obrigatórios" }),
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

    // Detect file category
    const isImage = fileType.startsWith("image/");
    const isVideo = fileType.startsWith("video/");
    const isPdf = fileType === "application/pdf";

    console.log(`Processing file: ${fileName}, type: ${fileType}, isImage: ${isImage}, isVideo: ${isVideo}, isPdf: ${isPdf}`);

    // For images, analyze with AI to get recommendations
    let aiAnalysis: any = null;
    
    if (isImage) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { 
              role: "system", 
              content: `Você é um especialista em design e marketing digital.
Analise a imagem e forneça recomendações para adaptação em anúncios.

Retorne APENAS um JSON válido:
{
  "detected_content": "descrição do que está na imagem",
  "main_subject_position": "centro", "esquerda", "direita", "topo" ou "base",
  "has_text": boolean,
  "text_content": "texto encontrado na imagem" ou null,
  "background_type": "sólido", "gradiente", "foto", "transparente",
  "dominant_colors": ["#hex1", "#hex2"],
  "quality_score": 1-10,
  "recommendations": {
    "instagram_feed": ["dica 1", "dica 2"],
    "instagram_stories": ["dica 1", "dica 2"],
    "facebook_ads": ["dica 1", "dica 2"],
    "google_ads": ["dica 1", "dica 2"],
    "marketplace": ["dica 1", "dica 2"]
  },
  "crop_suggestions": {
    "safe_zone": { "x": %, "y": %, "width": %, "height": % },
    "focus_point": { "x": %, "y": % }
  }
}`
            },
            { 
              role: "user", 
              content: [
                { type: "text", text: "Analise esta imagem para adaptação em anúncios:" },
                { type: "image_url", image_url: { url: `data:${fileType};base64,${fileBase64}` } }
              ]
            }
          ],
          max_tokens: 2000,
        }),
      });

      if (response.ok) {
        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content;
        if (content) {
          try {
            const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
            aiAnalysis = JSON.parse(jsonStr);
          } catch (e) {
            console.error("Failed to parse AI analysis:", e);
          }
        }
      }
    }

    // Generate outputs for each platform
    const platforms = targetPlatforms?.length > 0 
      ? targetPlatforms 
      : Object.keys(PLATFORM_SPECS);

    const outputs: ProcessedOutput[] = platforms
      .filter(p => PLATFORM_SPECS[p])
      .map(platform => {
        const spec = PLATFORM_SPECS[platform];
        const platformRecs = aiAnalysis?.recommendations?.[platform.replace("_", " ")] || [];
        
        return {
          platform: spec.name,
          platformKey: platform,
          dimensions: { width: spec.width, height: spec.height },
          aspectRatio: spec.aspectRatio,
          recommendations: [
            `Redimensionar para ${spec.width}x${spec.height}px`,
            ...platformRecs,
            aiAnalysis?.has_text ? "Verificar legibilidade do texto após redimensionamento" : null,
            aiAnalysis?.quality_score < 7 ? "Considere usar uma imagem de maior qualidade" : null,
          ].filter(Boolean) as string[],
        };
      });

    const result = {
      originalFile: {
        name: fileName,
        type: fileType,
        category: isImage ? "image" : isVideo ? "video" : isPdf ? "pdf" : "other",
      },
      analysis: aiAnalysis,
      outputs,
      supportedFormats: {
        image: ["JPG", "PNG", "WEBP"],
        video: ["MP4", "MOV"],
        document: ["PDF"],
      },
      processingTips: [
        isVideo ? "Vídeos devem ter duração máxima de 60s para Stories/Reels" : null,
        isPdf ? "PDFs serão convertidos em imagens para uso em anúncios" : null,
        "Use imagens com resolução mínima de 1080px no menor lado",
        "Evite texto ocupando mais de 20% da imagem para anúncios do Facebook",
      ].filter(Boolean),
    };

    console.log(`File processed successfully: ${fileName}`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-file-processor:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
