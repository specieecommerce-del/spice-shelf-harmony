import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrderEmailRequest {
  orderNsu: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
}

const formatPrice = (price: number) => {
  return `R$ ${price.toFixed(2).replace(".", ",")}`;
};

const generateItemsHtml = (items: OrderEmailRequest["items"]) => {
  return items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.price * item.quantity)}</td>
      </tr>
    `
    )
    .join("");
};

const generateCustomerEmailHtml = (order: OrderEmailRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2d5a27 0%, #4a7c43 100%); padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 Pagamento Confirmado!</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 32px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
        Olá <strong>${order.customerName}</strong>,
      </p>
      
      <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
        Recebemos seu pagamento PIX com sucesso! Seu pedido está sendo processado.
      </p>
      
      <!-- Order Details -->
      <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h2 style="font-size: 18px; color: #333; margin: 0 0 16px 0;">Detalhes do Pedido</h2>
        <p style="margin: 8px 0; color: #666;"><strong>Número:</strong> ${order.orderNsu}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <thead>
            <tr style="background-color: #eee;">
              <th style="padding: 12px; text-align: left; font-size: 14px;">Produto</th>
              <th style="padding: 12px; text-align: center; font-size: 14px;">Qtd</th>
              <th style="padding: 12px; text-align: right; font-size: 14px;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${generateItemsHtml(order.items)}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 16px 12px; font-weight: bold; font-size: 16px;">Total</td>
              <td style="padding: 16px 12px; font-weight: bold; font-size: 16px; text-align: right; color: #2d5a27;">${formatPrice(order.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <p style="font-size: 14px; color: #666; margin-bottom: 8px;">
        Em breve você receberá informações sobre o envio do seu pedido.
      </p>
      
      <p style="font-size: 14px; color: #666;">
        Agradecemos pela preferência!
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f4f4f4; padding: 24px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #999;">
        Este é um email automático. Por favor, não responda.
      </p>
    </div>
  </div>
</body>
</html>
`;

const generateAdminEmailHtml = (order: OrderEmailRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">💰 Novo Pagamento Recebido!</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 32px;">
      <div style="background-color: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #166534;">Pagamento PIX confirmado</p>
        <p style="margin: 8px 0 0 0; font-size: 28px; font-weight: bold; color: #15803d;">${formatPrice(order.totalAmount)}</p>
      </div>
      
      <!-- Customer Info -->
      <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h2 style="font-size: 16px; color: #333; margin: 0 0 12px 0;">👤 Dados do Cliente</h2>
        <p style="margin: 4px 0; color: #666;"><strong>Nome:</strong> ${order.customerName}</p>
        <p style="margin: 4px 0; color: #666;"><strong>Email:</strong> ${order.customerEmail}</p>
      </div>
      
      <!-- Order Details -->
      <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px;">
        <h2 style="font-size: 16px; color: #333; margin: 0 0 12px 0;">📦 Pedido #${order.orderNsu}</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
          <thead>
            <tr style="background-color: #eee;">
              <th style="padding: 10px; text-align: left; font-size: 13px;">Produto</th>
              <th style="padding: 10px; text-align: center; font-size: 13px;">Qtd</th>
              <th style="padding: 10px; text-align: right; font-size: 13px;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${generateItemsHtml(order.items)}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 14px 10px; font-weight: bold;">Total</td>
              <td style="padding: 14px 10px; font-weight: bold; text-align: right; color: #15803d;">${formatPrice(order.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f4f4f4; padding: 24px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #999;">
        Acesse o painel administrativo para gerenciar este pedido.
      </p>
    </div>
  </div>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  console.log("send-order-emails function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderNsu, customerName, customerEmail, totalAmount, items }: OrderEmailRequest = await req.json();

    console.log("Processing email for order:", orderNsu);

    if (!orderNsu || !customerName || !customerEmail || !totalAmount || !items) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const order: OrderEmailRequest = { orderNsu, customerName, customerEmail, totalAmount, items };

    // Get admin email from store_settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let adminEmail = "admin@loja.com"; // default fallback

    const { data: storeSettings } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "admin_email")
      .single();

    if (storeSettings?.value) {
      // value is stored as JSON, extract the string
      const emailValue = typeof storeSettings.value === 'string' 
        ? storeSettings.value 
        : JSON.stringify(storeSettings.value).replace(/"/g, '');
      if (emailValue && emailValue !== 'null') {
        adminEmail = emailValue;
      }
    }

    console.log("Sending emails to customer:", customerEmail, "and admin:", adminEmail);

    // Send email to customer
    const customerEmailResponse = await resend.emails.send({
      from: "Spice Shelf <onboarding@resend.dev>",
      to: [customerEmail],
      subject: `Pagamento Confirmado - Pedido #${orderNsu}`,
      html: generateCustomerEmailHtml(order),
    });

    console.log("Customer email sent:", customerEmailResponse);

    // Send email to admin
    const adminEmailResponse = await resend.emails.send({
      from: "Spice Shelf <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `💰 Novo Pagamento PIX - ${formatPrice(totalAmount)} - Pedido #${orderNsu}`,
      html: generateAdminEmailHtml(order),
    });

    console.log("Admin email sent:", adminEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        customerEmail: customerEmailResponse,
        adminEmail: adminEmailResponse
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-order-emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
