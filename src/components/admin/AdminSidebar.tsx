import { Package, Home, LogOut, PackageOpen, ShoppingBag, MessageSquare, LayoutDashboard, Users, FileText, Receipt, Boxes, CreditCard, FolderOpen, ChefHat, MessageSquareQuote, DollarSign, Calculator, Globe, PieChart, ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  { id: "dashboard", title: "Dashboard", icon: LayoutDashboard },
  { id: "financial", title: "Dashboard Financeiro", icon: PieChart },
  { id: "orders", title: "Pedidos", icon: Package },
  { id: "shipping", title: "Histórico & Envios", icon: PackageOpen },
  { id: "invoices", title: "Comprovantes", icon: FileText },
  { id: "nfe", title: "Notas Fiscais (NF-e)", icon: Receipt },
  { id: "products", title: "Produtos", icon: ShoppingBag },
  { id: "categories", title: "Categorias", icon: FolderOpen },
  { id: "stock", title: "Gestão de Estoque", icon: Boxes },
  { id: "pricing", title: "Precificação", icon: Calculator },
  { id: "expenses", title: "Custos e Gastos", icon: DollarSign },
  { id: "payments", title: "Pagamentos", icon: CreditCard },
  { id: "promotions", title: "Promoções", icon: DollarSign },
  { id: "banners", title: "Banners", icon: Globe },
  { id: "image-editor", title: "Editor de Imagens", icon: ImageIcon },
  { id: "recipes", title: "Receitas", icon: ChefHat },
  { id: "testimonials", title: "Depoimentos", icon: MessageSquareQuote },
  { id: "site-content", title: "Conteúdo do Site", icon: Globe },
  { id: "whatsapp", title: "Alertas WhatsApp", icon: MessageSquare },
  { id: "admins", title: "Administradores", icon: Users },
];

const AdminSidebar = ({ activeSection, onSectionChange }: AdminSidebarProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Administração
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onSectionChange(item.id)}
                    isActive={activeSection === item.id}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => navigate("/")} tooltip="Voltar ao Site">
              <Home className="h-4 w-4" />
              <span>Voltar ao Site</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} tooltip="Sair">
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar;
