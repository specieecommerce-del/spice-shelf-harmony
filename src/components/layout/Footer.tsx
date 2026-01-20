import { Facebook, Instagram, Youtube, MapPin, Phone, Mail, CreditCard, Shield } from "lucide-react";
const Footer = () => {
  return <footer className="bg-spice-brown text-spice-cream">
      {/* Main footer */}
      <div className="container-species py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand column */}
          <div>
            <h2 className="font-serif text-2xl font-bold text-spice-warm-white mb-4">
              SPECIES
            </h2>
            <p className="text-spice-cream/80 mb-6">
              Temperos artesanais de alta qualidade para transformar suas
              receitas em experiências gastronômicas únicas.
            </p>
            <div className="flex gap-4">
              <a href="https://instagram.com/speciesalimentos" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-spice-warm-white/10 flex items-center justify-center hover:bg-spice-gold transition-colors">
                <Instagram size={18} />
              </a>
              <a href="https://www.facebook.com/profile.php?id=61576860685498" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-spice-warm-white/10 flex items-center justify-center hover:bg-spice-gold transition-colors">
                <Facebook size={18} />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-spice-warm-white/10 flex items-center justify-center hover:bg-spice-gold transition-colors">
                <Youtube size={18} />
              </a>
            </div>
          </div>

          {/* Shop column */}
          <div>
            <h3 className="font-semibold text-spice-warm-white mb-4">Loja</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-spice-cream/80 hover:text-spice-gold transition-colors">
                  Todos os Produtos
                </a>
              </li>
              <li>
                <a href="#" className="text-spice-cream/80 hover:text-spice-gold transition-colors">
                  Ervas & Temperos
                </a>
              </li>
              <li>
                <a href="#" className="text-spice-cream/80 hover:text-spice-gold transition-colors">
                  Sais & Flor de Sal
                </a>
              </li>
              <li>
                <a href="#" className="text-spice-cream/80 hover:text-spice-gold transition-colors">
                  Kits & Presentes
                </a>
              </li>
              <li>
                <a href="#" className="text-spice-cream/80 hover:text-spice-gold transition-colors">
                  Promoções
                </a>
              </li>
            </ul>
          </div>

          {/* Help column */}
          <div>
            <h3 className="font-semibold text-spice-warm-white mb-4">Ajuda</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-spice-cream/80 hover:text-spice-gold transition-colors">
                  Central de Ajuda
                </a>
              </li>
              <li>
                <a href="#" className="text-spice-cream/80 hover:text-spice-gold transition-colors">
                  Rastrear Pedido
                </a>
              </li>
              <li>
                <a href="#" className="text-spice-cream/80 hover:text-spice-gold transition-colors">
                  Trocas e Devoluções
                </a>
              </li>
              <li>
                <a href="#" className="text-spice-cream/80 hover:text-spice-gold transition-colors">
                  Política de Privacidade
                </a>
              </li>
              <li>
                <a href="#" className="text-spice-cream/80 hover:text-spice-gold transition-colors">
                  Termos de Uso
                </a>
              </li>
            </ul>
          </div>

          {/* Contact column */}
          <div>
            <h3 className="font-semibold text-spice-warm-white mb-4">Contato</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="flex-shrink-0 mt-1 text-spice-gold" />
                <span className="text-spice-cream/80">
                  Rua Peixoto gomide 448      
                  <br />
                  São Paulo, SP - 01409-000   
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-spice-gold" />
                <a href="tel:+5511999999999" className="text-spice-cream/80 hover:text-spice-gold transition-colors">
                  (11) 91977-8073
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-spice-gold" />
                <a href="mailto:contato@species.com.br" className="text-spice-cream/80 hover:text-spice-gold transition-colors">
                  ​specieecommerce@gmail.com 
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-spice-warm-white/10">
        <div className="container-species py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p className="text-spice-cream/60 text-sm text-center md:text-left">
              © 2024 Species. Todos os direitos reservados.
            </p>

            {/* Payment methods */}
            <div className="flex items-center gap-4">
              <span className="text-spice-cream/60 text-sm">Pagamento seguro:</span>
              <div className="flex items-center gap-2">
                <CreditCard size={24} className="text-spice-cream/60" />
                <span className="text-spice-cream/60 text-sm">PIX • Cartão • Boleto</span>
              </div>
            </div>

            {/* Security */}
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-spice-forest-light" />
              <span className="text-spice-cream/60 text-sm">Site 100% Seguro</span>
            </div>
          </div>
        </div>
      </div>
    </footer>;
};
export default Footer;