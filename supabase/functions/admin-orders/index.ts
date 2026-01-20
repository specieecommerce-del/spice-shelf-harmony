import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's auth to verify their identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user and get claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.user.id;

    // Create service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Error checking permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Access denied. Admin role required." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, ...params } = await req.json();
    console.log("Admin action:", action, "params:", params);

    switch (action) {
      case "list_orders": {
        const { status, search, page = 1, limit = 20 } = params;
        
        let query = supabaseAdmin
          .from("orders")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (status && status !== "all") {
          query = query.eq("status", status);
        }

        if (search) {
          query = query.or(`order_nsu.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,tracking_code.ilike.%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) {
          console.error("List orders error:", error);
          throw error;
        }

        return new Response(
          JSON.stringify({ orders: data, total: count }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_tracking": {
        const { orderId, trackingCode, shippingCarrier, status } = params;

        if (!orderId) {
          return new Response(
            JSON.stringify({ error: "Order ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const updateData: Record<string, unknown> = {};
        
        if (trackingCode !== undefined) {
          updateData.tracking_code = trackingCode || null;
        }
        
        if (shippingCarrier !== undefined) {
          updateData.shipping_carrier = shippingCarrier || null;
        }
        
        if (status) {
          updateData.status = status;
        }

        // Set shipped_at when adding tracking code or changing to shipped status
        if ((trackingCode && !updateData.shipped_at) || status === "shipped") {
          updateData.shipped_at = new Date().toISOString();
        }

        const { data, error } = await supabaseAdmin
          .from("orders")
          .update(updateData)
          .eq("id", orderId)
          .select()
          .single();

        if (error) {
          console.error("Update tracking error:", error);
          throw error;
        }

        return new Response(
          JSON.stringify({ order: data, message: "Order updated successfully" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_order": {
        const { orderId } = params;

        if (!orderId) {
          return new Response(
            JSON.stringify({ error: "Order ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabaseAdmin
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (error) {
          console.error("Get order error:", error);
          throw error;
        }

        return new Response(
          JSON.stringify({ order: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "confirm_pix_payment": {
        const { orderId, paidAmount, notes } = params;

        if (!orderId) {
          return new Response(
            JSON.stringify({ error: "Order ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get order to verify it exists and is pending PIX
        const { data: existingOrder, error: fetchError } = await supabaseAdmin
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (fetchError || !existingOrder) {
          console.error("Order not found:", orderId, fetchError);
          return new Response(
            JSON.stringify({ error: "Order not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (existingOrder.status === "paid") {
          return new Response(
            JSON.stringify({ error: "Order is already marked as paid" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const confirmedAt = new Date().toISOString();
        const finalPaidAmount = paidAmount ? Math.round(paidAmount * 100) : existingOrder.total_amount;

        // Update order to paid status
        const { data: updatedOrder, error: updateError } = await supabaseAdmin
          .from("orders")
          .update({
            status: "paid",
            paid_amount: finalPaidAmount,
            pix_confirmed_by: userId,
            pix_confirmed_at: confirmedAt,
          })
          .eq("id", orderId)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating order:", orderId, updateError);
          throw updateError;
        }

        // Get admin email for audit log
        const { data: adminProfile } = await supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("user_id", userId)
          .maybeSingle();

        const adminEmail = claimsData.user.email || "unknown";
        const adminName = adminProfile?.full_name || adminEmail;

        // Create audit log entry
        const { error: auditError } = await supabaseAdmin
          .from("audit_logs")
          .insert({
            action: "confirm_pix_payment",
            entity_type: "order",
            entity_id: orderId,
            actor_id: userId,
            actor_email: adminEmail,
            details: {
              order_nsu: existingOrder.order_nsu,
              customer_name: existingOrder.customer_name,
              customer_email: existingOrder.customer_email,
              total_amount: existingOrder.total_amount,
              paid_amount: finalPaidAmount,
              previous_status: existingOrder.status,
              new_status: "paid",
              notes: notes || null,
              admin_name: adminName,
            },
          });

        if (auditError) {
          console.error("Audit log error (non-blocking):", auditError);
          // Don't fail the request for audit log errors
        }

        console.log(`PIX payment confirmed for order ${existingOrder.order_nsu} by ${adminEmail}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            order: updatedOrder, 
            message: "Pagamento PIX confirmado com sucesso" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_audit_logs": {
        const { orderId, page = 1, limit = 50 } = params;

        let query = supabaseAdmin
          .from("audit_logs")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (orderId) {
          query = query.eq("entity_id", orderId);
        }

        const { data, error, count } = await query;

        if (error) {
          console.error("Get audit logs error:", error);
          throw error;
        }

        return new Response(
          JSON.stringify({ logs: data, total: count }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Admin orders error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
