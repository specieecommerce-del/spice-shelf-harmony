import { useState, useEffect } from "react";
import { Plus, Trash2, Tag, Percent, DollarSign, Loader2, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

const CouponsManager = () => {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form state
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    description: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: 10,
    min_order_value: 0,
    max_uses: "",
    valid_until: "",
  });

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-coupons", {
        body: { action: "list" },
      });

      if (error) throw error;
      setCoupons(data.coupons || []);
    } catch (err) {
      console.error("Error loading coupons:", err);
      toast({
        title: "Erro ao carregar cupons",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreateCoupon = async () => {
    if (!newCoupon.code.trim()) {
      toast({
        title: "Código obrigatório",
        description: "Digite um código para o cupom.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke("manage-coupons", {
        body: {
          action: "create",
          coupon: {
            code: newCoupon.code,
            description: newCoupon.description || null,
            discount_type: newCoupon.discount_type,
            discount_value: newCoupon.discount_value,
            min_order_value: newCoupon.min_order_value || 0,
            max_uses: newCoupon.max_uses ? parseInt(newCoupon.max_uses) : null,
            valid_until: newCoupon.valid_until || null,
          },
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Erro ao criar cupom",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Cupom criado!",
        description: `Código ${data.coupon.code} pronto para uso.`,
      });

      setNewCoupon({
        code: "",
        description: "",
        discount_type: "percentage",
        discount_value: 10,
        min_order_value: 0,
        max_uses: "",
        valid_until: "",
      });
      setShowForm(false);
      loadCoupons();
    } catch (err) {
      console.error("Error creating coupon:", err);
      toast({
        title: "Erro ao criar cupom",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (couponId: string, isActive: boolean) => {
    try {
      const { error } = await supabase.functions.invoke("manage-coupons", {
        body: {
          action: "update",
          couponId,
          coupon: { is_active: isActive },
        },
      });

      if (error) throw error;

      setCoupons((prev) =>
        prev.map((c) => (c.id === couponId ? { ...c, is_active: isActive } : c))
      );

      toast({
        title: isActive ? "Cupom ativado" : "Cupom desativado",
        description: isActive ? "O cupom agora pode ser usado." : "O cupom foi desativado.",
      });
    } catch (err) {
      console.error("Error toggling coupon:", err);
      toast({
        title: "Erro ao atualizar cupom",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCoupon = async (couponId: string, code: string) => {
    if (!confirm(`Tem certeza que deseja excluir o cupom ${code}?`)) return;

    try {
      const { error } = await supabase.functions.invoke("manage-coupons", {
        body: { action: "delete", couponId },
      });

      if (error) throw error;

      setCoupons((prev) => prev.filter((c) => c.id !== couponId));
      toast({
        title: "Cupom excluído",
        description: `Cupom ${code} foi removido.`,
      });
    } catch (err) {
      console.error("Error deleting coupon:", err);
      toast({
        title: "Erro ao excluir cupom",
        variant: "destructive",
      });
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Código copiado!",
      description: `${code} copiado para a área de transferência.`,
    });
  };

  const formatPrice = (value: number) => {
    return `R$ ${value.toFixed(2).replace(".", ",")}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-spice-forest" />
          Cupons de Desconto
        </CardTitle>
        <CardDescription>
          Crie códigos promocionais para enviar aos seus clientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create Button */}
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Criar novo cupom
          </Button>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <h4 className="font-medium">Novo Cupom</h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coupon-code">Código do cupom *</Label>
                <Input
                  id="coupon-code"
                  placeholder="PROMO10"
                  value={newCoupon.code}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })
                  }
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coupon-description">Descrição</Label>
                <Input
                  id="coupon-description"
                  placeholder="Ex: 10% de desconto"
                  value={newCoupon.description}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, description: e.target.value })
                  }
                  maxLength={200}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de desconto</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={newCoupon.discount_type === "percentage" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewCoupon({ ...newCoupon, discount_type: "percentage" })}
                  >
                    <Percent className="h-4 w-4 mr-1" />
                    Porcentagem
                  </Button>
                  <Button
                    type="button"
                    variant={newCoupon.discount_type === "fixed" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewCoupon({ ...newCoupon, discount_type: "fixed" })}
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Valor fixo
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount-value">
                  Valor do desconto ({newCoupon.discount_type === "percentage" ? "%" : "R$"})
                </Label>
                <Input
                  id="discount-value"
                  type="number"
                  min="0"
                  max={newCoupon.discount_type === "percentage" ? 100 : 10000}
                  value={newCoupon.discount_value}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, discount_value: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="min-order">Pedido mínimo (R$)</Label>
                <Input
                  id="min-order"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newCoupon.min_order_value || ""}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, min_order_value: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-uses">Limite de usos</Label>
                <Input
                  id="max-uses"
                  type="number"
                  min="1"
                  placeholder="Ilimitado"
                  value={newCoupon.max_uses}
                  onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valid-until">Válido até</Label>
                <Input
                  id="valid-until"
                  type="date"
                  value={newCoupon.valid_until}
                  onChange={(e) => setNewCoupon({ ...newCoupon, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreateCoupon}
                disabled={isCreating}
                className="flex-1 bg-spice-forest hover:bg-spice-forest/90"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar cupom"
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Coupons List */}
        {coupons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum cupom criado ainda.</p>
            <p className="text-sm">Crie seu primeiro cupom para oferecer descontos!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className={`border rounded-lg p-4 transition-colors ${
                  coupon.is_active ? "bg-card" : "bg-muted/50 opacity-75"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-lg font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {coupon.code}
                      </code>
                      <button
                        onClick={() => handleCopyCode(coupon.code)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Copiar código"
                      >
                        {copiedCode === coupon.code ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                      <Badge variant={coupon.is_active ? "default" : "secondary"}>
                        {coupon.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    {coupon.description && (
                      <p className="text-sm text-muted-foreground mt-1">{coupon.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                      <span className="font-medium">
                        {coupon.discount_type === "percentage"
                          ? `${coupon.discount_value}% off`
                          : formatPrice(coupon.discount_value) + " off"}
                      </span>
                      {coupon.min_order_value > 0 && (
                        <span className="text-muted-foreground">
                          Mín: {formatPrice(coupon.min_order_value)}
                        </span>
                      )}
                      {coupon.max_uses && (
                        <span className="text-muted-foreground">
                          Usos: {coupon.current_uses}/{coupon.max_uses}
                        </span>
                      )}
                      {coupon.valid_until && (
                        <span className="text-muted-foreground">
                          Até: {new Date(coupon.valid_until).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={coupon.is_active}
                      onCheckedChange={(checked) => handleToggleActive(coupon.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CouponsManager;