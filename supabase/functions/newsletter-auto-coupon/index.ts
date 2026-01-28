import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NewsletterRequest {
  email: string;
  name?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, name }: NewsletterRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "E-mail é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get newsletter settings
    const { data: contentData } = await supabase
      .from("site_content")
      .select("content")
      .eq("section", "newsletter")
      .single();

    const settings = contentData?.content as {
      auto_coupon_enabled?: boolean;
      auto_coupon_code?: string;
      auto_coupon_discount?: number;
      auto_coupon_message?: string;
    } | null;

    const autoCouponEnabled = settings?.auto_coupon_enabled ?? false;
    const couponCode = settings?.auto_coupon_code ?? "BEMVINDO10";
    const discountPercent = settings?.auto_coupon_discount ?? 10;
    const emailMessage = settings?.auto_coupon_message ?? 
      "Obrigado por se inscrever! Aqui está seu cupom exclusivo de desconto:";

    // Verify coupon exists and is valid
    if (autoCouponEnabled) {
      const { data: couponData } = await supabase
        .from("discount_coupons")
        .select("*")
        .eq("code", couponCode)
        .eq("is_active", true)
        .single();

      if (!couponData) {
        console.log(`Coupon ${couponCode} not found or inactive`);
      }
    }

    // Send email if Resend is configured
    if (resendApiKey && autoCouponEnabled) {
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1a472a 0%, #2d5a3e 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; }
              .coupon-box { background: white; border: 2px dashed #c9a050; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
              .coupon-code { font-size: 28px; font-weight: bold; color: #1a472a; letter-spacing: 2px; }
              .discount { font-size: 18px; color: #c9a050; margin-top: 10px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🌿 Bem-vindo à nossa Newsletter!</h1>
              </div>
              <div class="content">
                <p>Olá${name ? ` ${name}` : ""}!</p>
                <p>${emailMessage}</p>
                <div class="coupon-box">
                  <div class="coupon-code">${couponCode}</div>
                  <div class="discount">${discountPercent}% de desconto na sua primeira compra</div>
                </div>
                <p>Use este código no checkout para aproveitar seu desconto exclusivo!</p>
                <p>Fique atento às nossas novidades, receitas exclusivas e ofertas especiais que enviaremos semanalmente.</p>
              </div>
              <div class="footer">
                <p>Você está recebendo este e-mail porque se inscreveu em nossa newsletter.</p>
                <p>Se não deseja mais receber nossos e-mails, você pode cancelar a qualquer momento.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Newsletter <onboarding@resend.dev>",
            to: [email],
            subject: `🎁 Seu cupom de ${discountPercent}% de desconto chegou!`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error("Resend error:", errorText);
        } else {
          console.log("Newsletter email sent successfully to:", email);
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Inscrição realizada com sucesso!",
        coupon_sent: autoCouponEnabled && !!resendApiKey
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Newsletter signup error:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao processar inscrição" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});