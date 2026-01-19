import { ShoppingCart, X, Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/contexts/CartContext";
import { Separator } from "@/components/ui/separator";

const CartDrawer = () => {
  const {
    items,
    removeFromCart,
    updateQuantity,
    getCartTotal,
    getCartCount,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2).replace(".", ",")}`;
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-serif">
            <ShoppingCart size={24} />
            Meu Carrinho ({getCartCount()})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <ShoppingCart size={64} className="text-muted-foreground/30 mb-4" />
            <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
              Seu carrinho está vazio
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              Adicione produtos deliciosos ao seu carrinho!
            </p>
            <Button variant="forest" onClick={() => setIsCartOpen(false)}>
              Continuar Comprando
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-3 bg-muted/30 rounded-lg"
                >
                  {/* Product Image */}
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-md"
                  />

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.category}
                    </p>
                    <p className="text-primary font-semibold mt-1">
                      {formatPrice(item.price)}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-medium text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Footer */}
            <div className="border-t pt-4 space-y-4">
              <Separator />
              
              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPrice(getCartTotal())}</span>
              </div>

              {/* Shipping */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frete</span>
                <span className="text-spice-forest font-medium">
                  {getCartTotal() >= 150 ? "Grátis" : "A calcular"}
                </span>
              </div>

              {/* Free shipping notice */}
              {getCartTotal() < 150 && (
                <p className="text-xs text-center text-muted-foreground bg-spice-gold/10 py-2 rounded">
                  Faltam {formatPrice(150 - getCartTotal())} para frete grátis!
                </p>
              )}

              <Separator />

              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="font-serif font-semibold text-lg">Total</span>
                <span className="font-bold text-xl text-primary">
                  {formatPrice(getCartTotal())}
                </span>
              </div>

              {/* Checkout Button */}
              <Button variant="hero" className="w-full" size="lg">
                Finalizar Compra
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setIsCartOpen(false)}
              >
                Continuar Comprando
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
