import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, ShoppingCart, Menu, X, User, Heart, Settings, Package, LogOut, LogIn, UserCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { getCartCount, setIsCartOpen } = useCart();
  const { user, signOut } = useAuth();
  const { getFavoritesCount } = useFavorites();
  
  const navLinks = [{
    name: "Produtos",
    href: "/produtos"
  }, {
    name: "Quem Somos",
    href: "/quem-somos"
  }, {
    name: "Receitas",
    href: "/receitas"
  }, {
    name: "Kits & Presentes",
    href: "/kits-presentes"
  }, {
    name: "Promoções",
    href: "/promocoes"
  }];

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        setIsAdmin(!!data);
      } catch {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-spice-warm-white/95 backdrop-blur-md border-b border-border">

      <div className="container-species">
        <div className="flex items-center justify-between h-16 lg:h-20 bg-white">
          {/* Mobile menu button */}
          <button className="lg:hidden p-2 text-foreground" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Logo */}
          <a href="/" className="flex items-center">
            <img alt="Species - Especialista na Harmonia dos Sabores da Natureza" className="h-8 lg:h-16 w-auto" src="/lovable-uploads/c333c3cf-8857-4c92-85ef-62b3af5c2685.jpg" />
          </a>

          {/* Desktop navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map(link => (
              <Link key={link.name} to={link.href} className="text-foreground hover:text-primary transition-colors font-medium">
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Right side icons */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Search */}
            <div className="hidden md:flex items-center">
              {isSearchOpen ? (
                <div className="flex items-center gap-2 animate-fade-in">
                  <Input type="text" placeholder="Buscar temperos..." className="w-48 lg:w-64 bg-spice-warm-white border-spice-warm-white" autoFocus />
                  <button onClick={() => setIsSearchOpen(false)}>
                    <X size={20} className="text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsSearchOpen(true)} className="p-2 text-foreground hover:text-primary transition-colors">
                  <Search size={22} />
                </button>
              )}
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden sm:flex p-2 text-foreground hover:text-primary transition-colors">
                  <User size={22} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user ? (
                  <>
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {user.email}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/meu-perfil" className="flex items-center gap-2 cursor-pointer">
                        <UserCircle size={16} />
                        Meu Perfil
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/meus-pedidos" className="flex items-center gap-2 cursor-pointer">
                        <Package size={16} />
                        Meus Pedidos
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="flex items-center gap-2 cursor-pointer text-primary font-medium">
                            <ShieldCheck size={16} />
                            Painel Admin
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/configuracoes" className="flex items-center gap-2 cursor-pointer">
                            <Settings size={16} />
                            Configurações
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleSignOut}
                      className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                    >
                      <LogOut size={16} />
                      Sair
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/auth" className="flex items-center gap-2 cursor-pointer">
                        <LogIn size={16} />
                        Entrar / Cadastrar
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Wishlist */}
            <a 
              href="#produtos" 
              className="hidden sm:flex relative p-2 text-foreground hover:text-primary transition-colors"
              onClick={(e) => {
                e.preventDefault();
                const productsSection = document.getElementById('produtos');
                if (productsSection) {
                  productsSection.scrollIntoView({ behavior: 'smooth' });
                  // Click on favorites tab after scrolling
                  setTimeout(() => {
                    const favTab = document.querySelector('[value="favorites"]') as HTMLButtonElement;
                    if (favTab) favTab.click();
                  }, 500);
                }
              }}
            >
              <Heart size={22} />
              {getFavoritesCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {getFavoritesCount()}
                </span>
              )}
            </a>

            {/* Cart */}
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-foreground hover:text-primary transition-colors"
            >
              <ShoppingCart size={22} />
              {getCartCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {getCartCount()}
                </span>
              )}
            </button>

            {/* WhatsApp Button */}
            <Button variant="forest" size="sm" className="hidden lg:flex">
              WhatsApp
            </Button>
          </div>
        </div>

        {/* Mobile navigation */}
        {isMenuOpen && (
          <nav className="lg:hidden py-4 border-t border-border animate-slide-up">
            <div className="flex flex-col gap-4">
              {/* Mobile search */}
              <div className="flex items-center gap-2 px-2">
                <Search size={18} className="text-muted-foreground" />
                <Input type="text" placeholder="Buscar temperos..." className="flex-1 bg-spice-warm-white border-spice-warm-white" />
              </div>

              {navLinks.map(link => (
                <Link key={link.name} to={link.href} className="px-2 py-2 text-foreground hover:text-primary transition-colors font-medium" onClick={() => setIsMenuOpen(false)}>
                  {link.name}
                </Link>
              ))}

              {/* Mobile user links */}
              <div className="border-t pt-4 mt-2 space-y-2">
                {user ? (
                  <>
                    <Link 
                      to="/meu-perfil" 
                      className="flex items-center gap-2 px-2 py-2 text-foreground hover:text-primary"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <UserCircle size={18} />
                      Meu Perfil
                    </Link>
                    <Link 
                      to="/meus-pedidos" 
                      className="flex items-center gap-2 px-2 py-2 text-foreground hover:text-primary"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Package size={18} />
                      Meus Pedidos
                    </Link>
                    {isAdmin && (
                      <>
                        <Link 
                          to="/admin" 
                          className="flex items-center gap-2 px-2 py-2 text-primary font-medium"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <ShieldCheck size={18} />
                          Painel Admin
                        </Link>
                        <Link 
                          to="/configuracoes" 
                          className="flex items-center gap-2 px-2 py-2 text-foreground hover:text-primary"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Settings size={18} />
                          Configurações
                        </Link>
                      </>
                    )}
                    <button 
                      onClick={() => { handleSignOut(); setIsMenuOpen(false); }}
                      className="flex items-center gap-2 px-2 py-2 text-red-600 w-full text-left"
                    >
                      <LogOut size={18} />
                      Sair
                    </button>
                  </>
                ) : (
                  <Link 
                    to="/auth" 
                    className="flex items-center gap-2 px-2 py-2 text-foreground hover:text-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <LogIn size={18} />
                    Entrar / Cadastrar
                  </Link>
                )}
              </div>

              <Button variant="forest" className="mt-2">
                Fale no WhatsApp
              </Button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
