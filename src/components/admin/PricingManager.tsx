import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Calculator, Save, TrendingUp, DollarSign, Percent } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";

interface Product {
  id: string;
  name: string;
  price: number;
  cost_price: number;
  tax_percentage: number;
  profit_margin: number;
}

const PricingManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [editedProducts, setEditedProducts] = useState<Record<string, Partial<Product>>>({});

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, price, cost_price, tax_percentage, profit_margin")
      .order("name", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar produtos");
      return;
    }
    setProducts(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const calculateSuggestedPrice = (costPrice: number, taxPercentage: number, profitMargin: number) => {
    // Price = Cost / (1 - tax% - margin%)
    const totalPercentage = (taxPercentage + profitMargin) / 100;
    if (totalPercentage >= 1) return costPrice * 2; // Fallback if percentages are too high
    return costPrice / (1 - totalPercentage);
  };

  const calculateActualMargin = (price: number, costPrice: number, taxPercentage: number) => {
    if (price === 0) return 0;
    const taxValue = price * (taxPercentage / 100);
    const profit = price - costPrice - taxValue;
    return (profit / price) * 100;
  };

  const getProductValue = (productId: string, field: keyof Product, defaultValue: number): number => {
    const value = editedProducts[productId]?.[field] ?? products.find(p => p.id === productId)?.[field] ?? defaultValue;
    return typeof value === 'number' ? value : defaultValue;
  };

  const updateProductField = (productId: string, field: keyof Product, value: number) => {
    setEditedProducts(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  };

  const handleSaveProduct = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const updates = editedProducts[productId];
    if (!updates) return;

    setIsSaving(productId);

    const { error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", productId);

    if (error) {
      toast.error("Erro ao salvar produto");
      setIsSaving(null);
      return;
    }

    toast.success("Produto atualizado!");
    setEditedProducts(prev => {
      const { [productId]: _, ...rest } = prev;
      return rest;
    });
    fetchProducts();
    setIsSaving(null);
  };

  const applySuggestedPrice = (productId: string) => {
    const costPrice = getProductValue(productId, "cost_price", 0);
    const taxPercentage = getProductValue(productId, "tax_percentage", 0);
    const profitMargin = getProductValue(productId, "profit_margin", 30);
    
    const suggestedPrice = calculateSuggestedPrice(costPrice, taxPercentage, profitMargin);
    updateProductField(productId, "price", Math.round(suggestedPrice * 100) / 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Precificação</h2>
        <p className="text-muted-foreground">Configure custos, impostos e margens para calcular preços automaticamente</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculadora de Preços
          </CardTitle>
          <CardDescription>
            Ajuste o custo, imposto e margem de lucro. O sistema sugere o preço de venda automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Custo (R$)</TableHead>
                  <TableHead className="text-right">Imposto (%)</TableHead>
                  <TableHead className="text-right">Margem (%)</TableHead>
                  <TableHead className="text-right">Preço Sugerido</TableHead>
                  <TableHead className="text-right">Preço Atual</TableHead>
                  <TableHead className="text-right">Margem Real</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const costPrice = getProductValue(product.id, "cost_price", product.cost_price);
                  const taxPercentage = getProductValue(product.id, "tax_percentage", product.tax_percentage);
                  const profitMargin = getProductValue(product.id, "profit_margin", product.profit_margin);
                  const currentPrice = getProductValue(product.id, "price", product.price);
                  
                  const suggestedPrice = calculateSuggestedPrice(costPrice, taxPercentage, profitMargin);
                  const actualMargin = calculateActualMargin(currentPrice, costPrice, taxPercentage);
                  const hasChanges = !!editedProducts[product.id];

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={costPrice}
                          onChange={(e) => updateProductField(product.id, "cost_price", parseFloat(e.target.value) || 0)}
                          className="w-24 ml-auto text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.1"
                          value={taxPercentage}
                          onChange={(e) => updateProductField(product.id, "tax_percentage", parseFloat(e.target.value) || 0)}
                          className="w-20 ml-auto text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="1"
                          value={profitMargin}
                          onChange={(e) => updateProductField(product.id, "profit_margin", parseFloat(e.target.value) || 0)}
                          className="w-20 ml-auto text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => applySuggestedPrice(product.id)}
                          className="text-primary hover:text-primary"
                        >
                          {formatCurrency(suggestedPrice)}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={currentPrice}
                          onChange={(e) => updateProductField(product.id, "price", parseFloat(e.target.value) || 0)}
                          className="w-24 ml-auto text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={actualMargin < profitMargin ? "text-destructive" : "text-primary"}>
                          {actualMargin.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {hasChanges && (
                          <Button
                            size="sm"
                            onClick={() => handleSaveProduct(product.id)}
                            disabled={isSaving === product.id}
                          >
                            {isSaving === product.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Total (Estoque)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(products.reduce((sum, p) => sum + p.cost_price, 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Média de Impostos</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(products.reduce((sum, p) => sum + p.tax_percentage, 0) / (products.length || 1)).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Margem Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {(products.reduce((sum, p) => {
                const margin = calculateActualMargin(p.price, p.cost_price, p.tax_percentage);
                return sum + margin;
              }, 0) / (products.length || 1)).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PricingManager;
