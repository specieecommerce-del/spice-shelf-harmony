import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import CartDrawer from "@/components/cart/CartDrawer";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import OrderHistory from "./pages/OrderHistory";
import HelpCenter from "./pages/HelpCenter";
import OrderTracking from "./pages/OrderTracking";
import ReturnsPolicy from "./pages/ReturnsPolicy";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import AboutUs from "./pages/AboutUs";
import Recipes from "./pages/Recipes";
import Products from "./pages/Products";
import KitsGifts from "./pages/KitsGifts";
import Promotions from "./pages/Promotions";
import ProductDetail from "./pages/ProductDetail";
import CategoryProducts from "./pages/CategoryProducts";
import ChatBot from "@/components/chat/ChatBot";
import { SpeedInsights } from "@vercel/speed-insights/react";
import DeliveryPolicy from "./pages/DeliveryPolicy";
import PaymentPolicy from "./pages/PaymentPolicy";
import LocalSeoSP from "./pages/LocalSeoSP";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <FavoritesProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <GATracker />
              <CartDrawer />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/configuracoes" element={<Settings />} />
                <Route path="/meus-pedidos" element={<OrderHistory />} />
                <Route path="/meu-perfil" element={<Profile />} />
                <Route path="/pagamento-confirmado" element={<PaymentConfirmation />} />
                <Route path="/ajuda" element={<HelpCenter />} />
                <Route path="/rastrear-pedido" element={<OrderTracking />} />
                <Route path="/trocas-devolucoes" element={<ReturnsPolicy />} />
                <Route path="/privacidade" element={<PrivacyPolicy />} />
                <Route path="/termos" element={<TermsOfUse />} />
                <Route path="/entregas" element={<DeliveryPolicy />} />
                <Route path="/pagamento" element={<PaymentPolicy />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/quem-somos" element={<AboutUs />} />
                <Route path="/receitas" element={<Recipes />} />
                <Route path="/produtos" element={<Products />} />
                <Route path="/produto/:id" element={<ProductDetail />} />
                <Route path="/categoria/:slug" element={<CategoryProducts />} />
                <Route path="/kits-presentes" element={<KitsGifts />} />
                <Route path="/promocoes" element={<Promotions />} />
                <Route path="/temperos-naturais-sao-paulo" element={<LocalSeoSP />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <ChatBot />
            </BrowserRouter>
            {import.meta.env.VITE_ENABLE_SPEED_INSIGHTS === "true" && <SpeedInsights />}
          </CartProvider>
        </FavoritesProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

const GATracker = () => {
  const location = useLocation();
  useEffect(() => {
    const id = (import.meta as any).env?.VITE_GA_ID || "G-ZZTSLQBNRN";
    const g = (window as any).gtag;
    if (typeof g === "function" && id) {
      g("config", id, { page_path: location.pathname });
    }
  }, [location.pathname]);
  return null;
};

export default App;
