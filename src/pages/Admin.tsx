import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardManager from "@/components/admin/DashboardManager";
import OrdersManager from "@/components/admin/OrdersManager";
import ShippingManager from "@/components/admin/ShippingManager";
import ProductsManager from "@/components/admin/ProductsManager";
import WhatsAppAlertsManager from "@/components/admin/WhatsAppAlertsManager";
import { AdminsManager } from "@/components/admin/AdminsManager";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const Admin = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          console.error("Error checking admin role:", error);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(!!data);
      } catch (error) {
        console.error("Error:", error);
        setIsAdmin(false);
      }
    };

    if (!authLoading) {
      checkAdminRole();
    }
  }, [user, authLoading]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <ShieldAlert className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Acesso Restrito</h1>
        <p className="text-muted-foreground">Você precisa estar logado para acessar esta página.</p>
        <Button onClick={() => navigate("/auth")}>Fazer Login</Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground">Você não tem permissão para acessar o painel administrativo.</p>
        <Button variant="outline" onClick={() => navigate("/")}>Voltar para Home</Button>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center px-4 gap-4 bg-card">
            <SidebarTrigger />
            <h1 className="font-semibold">Painel Administrativo</h1>
          </header>
          
          <div className="flex-1 p-6 overflow-auto">
            {activeSection === "dashboard" && <DashboardManager />}
            {activeSection === "orders" && <OrdersManager />}
            {activeSection === "shipping" && <ShippingManager />}
            {activeSection === "products" && <ProductsManager />}
            {activeSection === "whatsapp" && <WhatsAppAlertsManager />}
            {activeSection === "admins" && <AdminsManager />}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
