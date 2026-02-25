import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
                <Route path="/admin" element={<Admin />} />
                <Route path="/quem-somos" element={<AboutUs />} />
                <Route path="/receitas" element={<Recipes />} />
                <Route path="/produtos" element={<Products />} />
                <Route path="/produto/:id" element={<ProductDetail />} />
                <Route path="/categoria/:slug" element={<CategoryProducts />} />
                <Route path="/kits-presentes" element={<KitsGifts />} />
                <Route path="/promocoes" element={<Promotions />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <ChatBot />
            </BrowserRouter>
            {(
              import.meta.env.VITE_ENABLE_SPEED_INSIGHTS === "true" ||
              (!window.location.hostname.startsWith("localhost") &&
               !/^192\.168\./.test(window.location.hostname))
            ) && <SpeedInsights />}
          </CartProvider>
        </FavoritesProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
