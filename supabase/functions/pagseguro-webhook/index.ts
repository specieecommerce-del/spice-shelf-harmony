import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PagSeguroNotification {
  id: string;
  reference_id: string;
  created_at: string;
  charges?: Array<{
    id: string;
    reference_id: string;
    status: string;
    amount: {
      value: number;
      currency: string;
    };
    payment_method: {
      type: string;
    };
    paid_at?: string;
  }>;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const notification: PagSeguroNotification = await req.json();
    
    console.log("PagSeguro webhook received:", JSON.stringify(notification, null, 2));

    const orderNsu = notification.reference_id;
    
    if (!orderNsu) {
      console.error("No reference_id in notification");
      return new Response(
        JSON.stringify({ error: "Missing reference_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get charge status
    const charge = notification.charges?.[0];
    
    if (!charge) {
      console.log("No charges in notification, might be initial creation");
      return new Response(
        JSON.stringify({ success: true, message: "No charge to process" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map PagSeguro status to our status
    let newStatus: string;
    switch (charge.status) {
      case "PAID":
        newStatus = "paid";
        break;
      case "AUTHORIZED":
        newStatus = "pending"; // Awaiting capture
        break;
      case "DECLINED":
      case "CANCELED":
        newStatus = "cancelled";
        break;
      case "IN_ANALYSIS":
        newStatus = "pending";
        break;
      default:
        newStatus = "pending";
    }

    console.log(`Updating order ${orderNsu} to status: ${newStatus}`);

    // Atualizar pedido
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
      transaction_nsu: charge.id,
    };

    if (charge.status === "PAID") {
      updateData.paid_amount = charge.amount.value;
    }

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("order_nsu", orderNsu)
      .select("customer_name, customer_email, customer_phone, total_amount, items")
      .single();

    if (updateError) {
      console.error("Erro ao atualizar pedido:", updateError);
      return new Response(
        JSON.stringify({ error: "Falha ao atualizar pedido" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Pedido ${orderNsu} atualizado com sucesso`);

    // Enviar notificações automáticas quando pago
    if (newStatus === "paid" && updatedOrder) {
      try {
        // Enviar email de confirmação
        if (updatedOrder.customer_email) {
          const items = typeof updatedOrder.items === 'string' 
            ? JSON.parse(updatedOrder.items) 
            : updatedOrder.items;
          
          await supabaseAdmin.functions.invoke('send-order-emails', {
            body: {
              orderNsu: orderNsu,
              customerName: updatedOrder.customer_name || 'Cliente',
              customerEmail: updatedOrder.customer_email,
              totalAmount: updatedOrder.total_amount / 100,
              items: items.map((item: any) => ({
                name: item.name || item.product_name,
                price: (item.price || 0) / 100,
                quantity: item.quantity || 1,
              })),
            },
          });
          console.log('Email de confirmação enviado para:', updatedOrder.customer_email);
        }

        // Enviar notificação WhatsApp
        if (updatedOrder.customer_phone) {
          await supabaseAdmin.functions.invoke('order-alert-whatsapp', {
            body: {
              orderNsu: orderNsu,
              customerName: updatedOrder.customer_name || 'Cliente',
              customerPhone: updatedOrder.customer_phone,
              totalAmount: updatedOrder.total_amount,
              status: 'paid',
            },
          });
          console.log('WhatsApp enviado para:', updatedOrder.customer_phone);
        }
      } catch (notifyError) {
        console.error('Erro ao enviar notificações:', notifyError);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    console.error("Error in pagseguro-webhook:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
