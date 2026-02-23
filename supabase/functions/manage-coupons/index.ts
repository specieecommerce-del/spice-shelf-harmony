import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CouponRequest {
  action: "create" | "list" | "update" | "delete" | "validate";
  coupon?: {
    code: string;
    description?: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    min_order_value?: number;
    max_uses?: number;
    valid_from?: string;
    valid_until?: string;
    is_active?: boolean;
  };
  couponId?: string;
  code?: string;
  orderTotal?: number;
}

async function verifyAdmin(req: Request, supabaseUrl: string, supabaseServiceKey: string): Promise<{ isAdmin: boolean; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { isAdmin: false, error: "Token de autenticação não fornecido" };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || supabaseServiceKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
  if (error || !user) {
    return { isAdmin: false, error: "Usuário não autenticado" };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roles) {
    return { isAdmin: false, error: "Acesso não autorizado" };
  }

  return { isAdmin: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CouponRequest = await req.json();
    const { action } = body;

    console.log(`[manage-coupons] Action: ${action}`);

    // "validate" is public (used during checkout), all other actions require admin
    if (action !== "validate") {
      const { isAdmin, error: authError } = await verifyAdmin(req, supabaseUrl, supabaseServiceKey);
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: authError }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    switch (action) {
      case "create": {
        if (!body.coupon?.code || !body.coupon?.discount_value) {
          return new Response(
            JSON.stringify({ error: "Código e valor do desconto são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const code = body.coupon.code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
        if (code.length < 3) {
          return new Response(
            JSON.stringify({ error: "Código deve ter pelo menos 3 caracteres" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase
          .from("discount_coupons")
          .insert({
            code,
            description: body.coupon.description?.slice(0, 200) || null,
            discount_type: body.coupon.discount_type || "percentage",
            discount_value: Math.max(0, body.coupon.discount_value),
            min_order_value: body.coupon.min_order_value || 0,
            max_uses: body.coupon.max_uses || null,
            valid_from: body.coupon.valid_from || new Date().toISOString(),
            valid_until: body.coupon.valid_until || null,
            is_active: body.coupon.is_active !== false,
          })
          .select()
          .single();

        if (error) {
          console.error("[manage-coupons] Create error:", error);
          if (error.code === "23505") {
            return new Response(
              JSON.stringify({ error: "Já existe um cupom com este código" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          throw error;
        }

        console.log("[manage-coupons] Created coupon:", data.code);
        return new Response(
          JSON.stringify({ success: true, coupon: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list": {
        const { data, error } = await supabase
          .from("discount_coupons")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[manage-coupons] List error:", error);
          throw error;
        }

        return new Response(
          JSON.stringify({ coupons: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update": {
        if (!body.couponId) {
          return new Response(
            JSON.stringify({ error: "ID do cupom é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const updateData: Record<string, unknown> = {};
        if (body.coupon?.description !== undefined) updateData.description = body.coupon.description?.slice(0, 200);
        if (body.coupon?.discount_type) updateData.discount_type = body.coupon.discount_type;
        if (body.coupon?.discount_value !== undefined) updateData.discount_value = Math.max(0, body.coupon.discount_value);
        if (body.coupon?.min_order_value !== undefined) updateData.min_order_value = body.coupon.min_order_value;
        if (body.coupon?.max_uses !== undefined) updateData.max_uses = body.coupon.max_uses;
        if (body.coupon?.valid_until !== undefined) updateData.valid_until = body.coupon.valid_until;
        if (body.coupon?.is_active !== undefined) updateData.is_active = body.coupon.is_active;

        const { data, error } = await supabase
          .from("discount_coupons")
          .update(updateData)
          .eq("id", body.couponId)
          .select()
          .single();

        if (error) {
          console.error("[manage-coupons] Update error:", error);
          throw error;
        }

        console.log("[manage-coupons] Updated coupon:", data.code);
        return new Response(
          JSON.stringify({ success: true, coupon: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        if (!body.couponId) {
          return new Response(
            JSON.stringify({ error: "ID do cupom é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await supabase
          .from("discount_coupons")
          .delete()
          .eq("id", body.couponId);

        if (error) {
          console.error("[manage-coupons] Delete error:", error);
          throw error;
        }

        console.log("[manage-coupons] Deleted coupon:", body.couponId);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "validate": {
        if (!body.code) {
          return new Response(
            JSON.stringify({ error: "Código do cupom é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const code = body.code.toUpperCase().replace(/[^A-Z0-9]/g, "");
        const orderTotal = body.orderTotal || 0;

        const { data: coupon, error } = await supabase
          .from("discount_coupons")
          .select("*")
          .eq("code", code)
          .eq("is_active", true)
          .single();

        if (error || !coupon) {
          return new Response(
            JSON.stringify({ valid: false, error: "Cupom não encontrado ou inativo" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const now = new Date();
        if (coupon.valid_from && new Date(coupon.valid_from) > now) {
          return new Response(
            JSON.stringify({ valid: false, error: "Cupom ainda não está ativo" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (coupon.valid_until && new Date(coupon.valid_until) < now) {
          return new Response(
            JSON.stringify({ valid: false, error: "Cupom expirado" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
          return new Response(
            JSON.stringify({ valid: false, error: "Cupom atingiu o limite de usos" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (coupon.min_order_value && orderTotal < coupon.min_order_value) {
          return new Response(
            JSON.stringify({ 
              valid: false, 
              error: `Pedido mínimo de R$ ${Number(coupon.min_order_value).toFixed(2).replace(".", ",")}` 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let discountAmount = 0;
        if (coupon.discount_type === "percentage") {
          discountAmount = (orderTotal * coupon.discount_value) / 100;
        } else {
          discountAmount = Math.min(coupon.discount_value, orderTotal);
        }

        console.log(`[manage-coupons] Validated coupon ${code}: ${discountAmount} off`);

        return new Response(
          JSON.stringify({
            valid: true,
            coupon: {
              code: coupon.code,
              description: coupon.description,
              discount_type: coupon.discount_type,
              discount_value: coupon.discount_value,
              discountAmount,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Ação inválida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[manage-coupons] Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
