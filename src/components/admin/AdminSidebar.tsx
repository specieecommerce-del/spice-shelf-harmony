import { Package, Home, LogOut, PackageOpen, ShoppingBag, MessageSquare, LayoutDashboard, Users, FileText, Receipt, Boxes, CreditCard, FolderOpen, ChefHat, MessageSquareQuote, DollarSign, Calculator, Globe, PieChart, ImageIcon, BarChart3, Sparkles, Zap, Clock, History, Building2 } from "lucide-react";
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

// Menu organizado por categorias
const menuGroups = [
  {
    label: "Visão Geral",
    items: [
      { id: "dashboard", title: "Dashboard", icon: LayoutDashboard },
      { id: "financial", title: "Dashboard Financeiro", icon: PieChart },
      { id: "reports", title: "Relatórios Mensais", icon: BarChart3 },
    ],
  },
  {
    label: "Pedidos",
    items: [
      { id: "orders", title: "Todos os Pedidos", icon: Package },
      { id: "shipping", title: "Histórico & Envios", icon: PackageOpen },
      { id: "invoices", title: "Comprovantes", icon: FileText },
      { id: "nfe", title: "Notas Fiscais (NF-e)", icon: Receipt },
    ],
  },
  {
    label: "Pagamentos",
    items: [
      { id: "gateway-status", title: "Gateway de Pagamento", icon: Zap },
      { id: "bank-connection", title: "Conexão Bancária", icon: Building2 },
      { id: "auto-verification", title: "Confirmações Automáticas", icon: Clock },
      { id: "approved-payments", title: "Pagamentos Aprovados", icon: CreditCard },
      { id: "payment-logs", title: "Logs do Sistema", icon: History },
      { id: "payments", title: "Configurações", icon: DollarSign },
    ],
  },
  {
    label: "Produtos",
    items: [
      { id: "products", title: "Catálogo", icon: ShoppingBag },
      { id: "ai-products", title: "Criar com IA", icon: Sparkles },
      { id: "categories", title: "Categorias", icon: FolderOpen },
      { id: "stock", title: "Gestão de Estoque", icon: Boxes },
      { id: "pricing", title: "Precificação", icon: Calculator },
      { id: "expenses", title: "Custos e Gastos", icon: DollarSign },
    ],
  },
  {
    label: "Receitas",
    items: [
      { id: "recipes", title: "Todas as Receitas", icon: ChefHat },
      { id: "ai-recipes", title: "Criar com IA", icon: Sparkles },
    ],
  },
  {
    label: "Marketing",
    items: [
      { id: "promotions", title: "Promoções", icon: DollarSign },
      { id: "banners", title: "Banners", icon: Globe },
      { id: "image-editor", title: "Editor de Imagens", icon: ImageIcon },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { id: "testimonials", title: "Depoimentos", icon: MessageSquareQuote },
      { id: "site-content", title: "Conteúdo do Site", icon: Globe },
    ],
  },
  {
    label: "Sistema",
    items: [
      { id: "whatsapp", title: "Alertas WhatsApp", icon: MessageSquare },
      { id: "admins", title: "Administradores", icon: Users },
    ],
  },
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
      <SidebarContent className="overflow-y-auto">
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
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
        ))}
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
