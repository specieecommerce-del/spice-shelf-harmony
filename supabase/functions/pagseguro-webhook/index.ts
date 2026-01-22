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

    // Update order
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
      transaction_nsu: charge.id,
    };

    if (charge.status === "PAID") {
      updateData.paid_amount = charge.amount.value;
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("order_nsu", orderNsu);

    if (updateError) {
      console.error("Error updating order:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Order ${orderNsu} updated successfully`);

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
