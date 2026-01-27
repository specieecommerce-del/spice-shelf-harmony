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
import FinancialDashboard from "@/components/admin/FinancialDashboard";
import OrdersManager from "@/components/admin/OrdersManager";
import ShippingManager from "@/components/admin/ShippingManager";
import ProductsManager from "@/components/admin/ProductsManager";
import CategoriesManager from "@/components/admin/CategoriesManager";
import StockManager from "@/components/admin/StockManager";
import PricingManager from "@/components/admin/PricingManager";
import ExpensesManager from "@/components/admin/ExpensesManager";
import RecipesManager from "@/components/admin/RecipesManager";
import TestimonialsManager from "@/components/admin/TestimonialsManager";
import SiteContentManager from "@/components/admin/SiteContentManager";
import WhatsAppAlertsManager from "@/components/admin/WhatsAppAlertsManager";
import { AdminsManager } from "@/components/admin/AdminsManager";
import InvoiceManager from "@/components/admin/InvoiceManager";
import FocusNFeSettings from "@/components/admin/FocusNFeSettings";
import BoletoSettingsManager from "@/components/admin/BoletoSettingsManager";
import PromotionsManager from "@/components/admin/PromotionsManager";
import BannersManager from "@/components/admin/BannersManager";
import ImageEditorManager from "@/components/admin/ImageEditorManager";
import MonthlyReportsManager from "@/components/admin/MonthlyReportsManager";
import AIProductCreator from "@/components/admin/AIProductCreator";
import AIRecipeCreator from "@/components/admin/AIRecipeCreator";
import AutoVerificationManager from "@/components/admin/AutoVerificationManager";
import PaymentLogsManager from "@/components/admin/PaymentLogsManager";
import ApprovedPaymentsManager from "@/components/admin/ApprovedPaymentsManager";
import GatewayStatusManager from "@/components/admin/GatewayStatusManager";
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
            {activeSection === "financial" && <FinancialDashboard />}
            {activeSection === "reports" && <MonthlyReportsManager />}
            {activeSection === "orders" && <OrdersManager />}
            {activeSection === "auto-verification" && <AutoVerificationManager />}
            {activeSection === "shipping" && <ShippingManager />}
            {activeSection === "invoices" && <InvoiceManager />}
            {activeSection === "nfe" && <FocusNFeSettings />}
            {activeSection === "gateway-status" && <GatewayStatusManager />}
            {activeSection === "auto-verification" && <AutoVerificationManager />}
            {activeSection === "approved-payments" && <ApprovedPaymentsManager />}
            {activeSection === "payment-logs" && <PaymentLogsManager />}
            {activeSection === "payments" && <BoletoSettingsManager />}
            {activeSection === "products" && <ProductsManager />}
            {activeSection === "ai-products" && <AIProductCreator />}
            {activeSection === "categories" && <CategoriesManager />}
            {activeSection === "stock" && <StockManager />}
            {activeSection === "pricing" && <PricingManager />}
            {activeSection === "expenses" && <ExpensesManager />}
            {activeSection === "promotions" && <PromotionsManager />}
            {activeSection === "banners" && <BannersManager />}
            {activeSection === "image-editor" && <ImageEditorManager />}
            {activeSection === "recipes" && <RecipesManager />}
            {activeSection === "ai-recipes" && <AIRecipeCreator />}
            {activeSection === "testimonials" && <TestimonialsManager />}
            {activeSection === "site-content" && <SiteContentManager />}
            {activeSection === "whatsapp" && <WhatsAppAlertsManager />}
            {activeSection === "admins" && <AdminsManager />}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
