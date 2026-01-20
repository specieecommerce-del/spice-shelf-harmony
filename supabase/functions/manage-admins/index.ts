import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Access denied. Admin role required." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if admin has permission to manage admins
    const { data: permData } = await supabaseAdmin
      .from("admin_permissions")
      .select("can_manage_admins")
      .eq("user_id", userId)
      .maybeSingle();

    // First admin (no permissions set) can manage admins, or admin with explicit permission
    const canManageAdmins = !permData || permData.can_manage_admins;

    const { action, ...params } = await req.json();
    console.log("Admin management action:", action);

    switch (action) {
      case "list_admins": {
        // Get all admins with their permissions
        const { data: admins, error: adminsError } = await supabaseAdmin
          .from("user_roles")
          .select("user_id, role, created_at")
          .eq("role", "admin");

        if (adminsError) throw adminsError;

        // Get permissions for each admin
        const adminIds = admins?.map(a => a.user_id) || [];
        
        const { data: permissions } = await supabaseAdmin
          .from("admin_permissions")
          .select("*")
          .in("user_id", adminIds);

        // Get user emails from auth
        const adminDetails = await Promise.all(
          (admins || []).map(async (admin) => {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(admin.user_id);
            const perm = permissions?.find(p => p.user_id === admin.user_id);
            
            return {
              user_id: admin.user_id,
              email: authUser?.user?.email || "Unknown",
              created_at: admin.created_at,
              permissions: perm || {
                can_view_dashboard: true,
                can_manage_orders: true,
                can_manage_shipping: true,
                can_manage_products: true,
                can_manage_whatsapp: true,
                can_manage_admins: true,
              },
            };
          })
        );

        return new Response(
          JSON.stringify({ admins: adminDetails }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "add_admin": {
        if (!canManageAdmins) {
          return new Response(
            JSON.stringify({ error: "Você não tem permissão para gerenciar administradores." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { email, permissions } = params;

        if (!email) {
          return new Response(
            JSON.stringify({ error: "Email é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Find user by email
        const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (usersError) throw usersError;

        const targetUser = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

        if (!targetUser) {
          return new Response(
            JSON.stringify({ error: "Usuário não encontrado. O usuário precisa ter uma conta cadastrada." }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if already admin
        const { data: existingRole } = await supabaseAdmin
          .from("user_roles")
          .select("id")
          .eq("user_id", targetUser.id)
          .eq("role", "admin")
          .maybeSingle();

        if (existingRole) {
          return new Response(
            JSON.stringify({ error: "Este usuário já é um administrador." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Add admin role
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: targetUser.id, role: "admin" });

        if (roleError) throw roleError;

        // Add permissions
        const { error: permError } = await supabaseAdmin
          .from("admin_permissions")
          .insert({
            user_id: targetUser.id,
            can_view_dashboard: permissions?.can_view_dashboard ?? true,
            can_manage_orders: permissions?.can_manage_orders ?? false,
            can_manage_shipping: permissions?.can_manage_shipping ?? false,
            can_manage_products: permissions?.can_manage_products ?? false,
            can_manage_whatsapp: permissions?.can_manage_whatsapp ?? false,
            can_manage_admins: permissions?.can_manage_admins ?? false,
          });

        if (permError) throw permError;

        return new Response(
          JSON.stringify({ success: true, message: "Administrador adicionado com sucesso" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_permissions": {
        if (!canManageAdmins) {
          return new Response(
            JSON.stringify({ error: "Você não tem permissão para gerenciar administradores." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { targetUserId, permissions } = params;

        if (!targetUserId) {
          return new Response(
            JSON.stringify({ error: "ID do usuário é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Upsert permissions
        const { error } = await supabaseAdmin
          .from("admin_permissions")
          .upsert({
            user_id: targetUserId,
            can_view_dashboard: permissions?.can_view_dashboard ?? true,
            can_manage_orders: permissions?.can_manage_orders ?? false,
            can_manage_shipping: permissions?.can_manage_shipping ?? false,
            can_manage_products: permissions?.can_manage_products ?? false,
            can_manage_whatsapp: permissions?.can_manage_whatsapp ?? false,
            can_manage_admins: permissions?.can_manage_admins ?? false,
          }, { onConflict: "user_id" });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: "Permissões atualizadas com sucesso" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "remove_admin": {
        if (!canManageAdmins) {
          return new Response(
            JSON.stringify({ error: "Você não tem permissão para gerenciar administradores." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { targetUserId } = params;

        if (!targetUserId) {
          return new Response(
            JSON.stringify({ error: "ID do usuário é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Cannot remove yourself
        if (targetUserId === userId) {
          return new Response(
            JSON.stringify({ error: "Você não pode remover seu próprio acesso de administrador." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Remove permissions first
        await supabaseAdmin
          .from("admin_permissions")
          .delete()
          .eq("user_id", targetUserId);

        // Remove admin role
        const { error } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", targetUserId)
          .eq("role", "admin");

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: "Administrador removido com sucesso" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_my_permissions": {
        const { data: myPerm } = await supabaseAdmin
          .from("admin_permissions")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        // If no permissions set, return full access (for first admin)
        const permissions = myPerm || {
          can_view_dashboard: true,
          can_manage_orders: true,
          can_manage_shipping: true,
          can_manage_products: true,
          can_manage_whatsapp: true,
          can_manage_admins: true,
        };

        return new Response(
          JSON.stringify({ permissions }),
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
    console.error("Manage admins error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
