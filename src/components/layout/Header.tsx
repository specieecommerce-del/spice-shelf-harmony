import { useState } from "react";
import { Search, ShoppingCart, Menu, X, User, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logoSpecies from "@/assets/logo-species.jpeg";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const cartItems = 3;

  const navLinks = [
    { name: "Produtos", href: "#produtos" },
    { name: "Quem Somos", href: "#quem-somos" },
    { name: "Receitas", href: "#receitas" },
    { name: "Kits & Presentes", href: "#kits" },
    { name: "Promoções", href: "#promocoes" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-spice-warm-white/95 backdrop-blur-md border-b border-border">
      {/* Top bar with promo */}
      <div className="bg-spice-forest text-spice-warm-white text-center py-2 text-sm font-medium">
        🚚 Frete Grátis em compras acima de R$150 | Use o cupom: <span className="font-bold">SPECIES10</span>
      </div>

      <div className="container-species">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Logo */}
          <a href="/" className="flex items-center">
            <img 
              src={logoSpecies} 
              alt="Species" 
              className="h-10 lg:h-14 w-auto"
            />
          </a>

          {/* Desktop navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Right side icons */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Search */}
            <div className="hidden md:flex items-center">
              {isSearchOpen ? (
                <div className="flex items-center gap-2 animate-fade-in">
                  <Input
                    type="text"
                    placeholder="Buscar temperos..."
                    className="w-48 lg:w-64"
                    autoFocus
                  />
                  <button onClick={() => setIsSearchOpen(false)}>
                    <X size={20} className="text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2 text-foreground hover:text-primary transition-colors"
                >
                  <Search size={22} />
                </button>
              )}
            </div>

            {/* User */}
            <button className="hidden sm:flex p-2 text-foreground hover:text-primary transition-colors">
              <User size={22} />
            </button>

            {/* Wishlist */}
            <button className="hidden sm:flex p-2 text-foreground hover:text-primary transition-colors">
              <Heart size={22} />
            </button>

            {/* Cart */}
            <button className="relative p-2 text-foreground hover:text-primary transition-colors">
              <ShoppingCart size={22} />
              {cartItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItems}
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
                <Input
                  type="text"
                  placeholder="Buscar temperos..."
                  className="flex-1"
                />
              </div>

              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="px-2 py-2 text-foreground hover:text-primary transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
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
