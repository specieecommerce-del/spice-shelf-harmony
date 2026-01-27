import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, ScanLine, Calculator, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NutritionalData {
  calories: number;
  carbohydrates: number;
  proteins: number;
  total_fat: number;
  saturated_fat: number;
  trans_fat: number;
  fiber: number;
  sodium: number;
  portion_size: string;
  disclaimer: string;
  source?: string;
  confidence?: string;
}

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

interface NutritionGeneratorProps {
  productName?: string;
  productCategory?: string;
  onNutritionGenerated: (data: NutritionalData) => void;
}

const NutritionGenerator = ({ productName, productCategory, onNutritionGenerated }: NutritionGeneratorProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("database");
  const [nutritionData, setNutritionData] = useState<NutritionalData | null>(null);
  
  // Database method state
  const [searchName, setSearchName] = useState(productName || "");
  const [searchCategory, setSearchCategory] = useState(productCategory || "");
  
  // OCR method state
  const [labelPreview, setLabelPreview] = useState<string | null>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  
  // Calculate method state
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: "", quantity: 0, unit: "g" }
  ]);
  const [portionSize, setPortionSize] = useState(100);

  const handleDatabaseLookup = async () => {
    if (!searchName.trim()) {
      toast.error("Digite o nome do produto");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-nutrition-generator", {
        body: {
          method: "database",
          productName: searchName,
          productCategory: searchCategory,
        },
      });

      if (error) throw error;
      
      setNutritionData(data.data);
      toast.success("Informações nutricionais encontradas!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao buscar informações nutricionais");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLabelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione apenas imagens");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setLabelPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleOCRAnalysis = async () => {
    if (!labelPreview) {
      toast.error("Envie uma foto do rótulo primeiro");
      return;
    }

    setIsLoading(true);
    try {
      const base64 = labelPreview.split(",")[1];
      
      const { data, error } = await supabase.functions.invoke("ai-nutrition-generator", {
        body: {
          method: "ocr",
          labelImageBase64: base64,
        },
      });

      if (error) throw error;
      
      setNutritionData(data.data);
      toast.success("Rótulo analisado com sucesso!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao analisar rótulo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculate = async () => {
    const validIngredients = ingredients.filter(i => i.name.trim() && i.quantity > 0);
    
    if (validIngredients.length === 0) {
      toast.error("Adicione pelo menos um ingrediente");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-nutrition-generator", {
        body: {
          method: "calculate",
          ingredients: validIngredients,
          portionSize,
        },
      });

      if (error) throw error;
      
      setNutritionData(data.data);
      toast.success("Valores nutricionais calculados!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao calcular valores nutricionais");
    } finally {
      setIsLoading(false);
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: "", quantity: 0, unit: "g" }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleUseNutrition = () => {
    if (nutritionData) {
      onNutritionGenerated(nutritionData);
      toast.success("Informações nutricionais aplicadas ao produto!");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Informações Nutricionais Automáticas
        </CardTitle>
        <CardDescription>
          Gere a tabela nutricional usando 3 métodos diferentes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="database" className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Banco TACO</span>
            </TabsTrigger>
            <TabsTrigger value="ocr" className="flex items-center gap-1">
              <ScanLine className="h-4 w-4" />
              <span className="hidden sm:inline">OCR Rótulo</span>
            </TabsTrigger>
            <TabsTrigger value="calculate" className="flex items-center gap-1">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Calcular</span>
            </TabsTrigger>
          </TabsList>

          {/* Method 1: Database Lookup */}
          <TabsContent value="database" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Busca automática em tabelas TACO (Brasil) e USDA para alimentos comuns.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Produto</Label>
                <Input
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Ex: Cúrcuma em pó"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  placeholder="Ex: Temperos"
                />
              </div>
            </div>
            <Button onClick={handleDatabaseLookup} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
              Buscar Informações Nutricionais
            </Button>
          </TabsContent>

          {/* Method 2: OCR */}
          <TabsContent value="ocr" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Envie uma foto do rótulo nutricional e a IA extrairá os dados automaticamente.
            </p>
            <div 
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => labelInputRef.current?.click()}
            >
              <input
                ref={labelInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLabelUpload}
              />
              {labelPreview ? (
                <img src={labelPreview} alt="Rótulo" className="max-h-48 mx-auto rounded" />
              ) : (
                <div>
                  <ScanLine className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Clique para enviar foto do rótulo</p>
                </div>
              )}
            </div>
            {labelPreview && (
              <Button onClick={handleOCRAnalysis} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ScanLine className="h-4 w-4 mr-2" />}
                Analisar Rótulo
              </Button>
            )}
          </TabsContent>

          {/* Method 3: Calculate */}
          <TabsContent value="calculate" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Informe os ingredientes e a IA calculará os valores nutricionais automaticamente.
            </p>
            
            <div className="space-y-2">
              <Label>Ingredientes</Label>
              {ingredients.map((ingredient, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={ingredient.name}
                    onChange={(e) => updateIngredient(index, "name", e.target.value)}
                    placeholder="Nome do ingrediente"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={ingredient.quantity || ""}
                    onChange={(e) => updateIngredient(index, "quantity", parseFloat(e.target.value) || 0)}
                    placeholder="Qtd"
                    className="w-20"
                  />
                  <Select
                    value={ingredient.unit}
                    onValueChange={(value) => updateIngredient(index, "unit", value)}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="mg">mg</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="un">un</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                    disabled={ingredients.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addIngredient}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Ingrediente
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Tamanho da Porção (g)</Label>
              <Input
                type="number"
                value={portionSize}
                onChange={(e) => setPortionSize(parseInt(e.target.value) || 100)}
              />
            </div>

            <Button onClick={handleCalculate} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
              Calcular Valores Nutricionais
            </Button>
          </TabsContent>
        </Tabs>

        {/* Results Display */}
        {nutritionData && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Tabela Nutricional</h4>
              {nutritionData.confidence && (
                <Badge variant={nutritionData.confidence === "alta" ? "default" : "secondary"}>
                  Confiança: {nutritionData.confidence}
                </Badge>
              )}
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left p-2 font-medium">Nutriente</th>
                    <th className="text-right p-2 font-medium">Porção ({nutritionData.portion_size})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-2">Valor Energético</td>
                    <td className="text-right p-2 font-medium">{nutritionData.calories} kcal</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2">Carboidratos</td>
                    <td className="text-right p-2">{nutritionData.carbohydrates}g</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2">Proteínas</td>
                    <td className="text-right p-2">{nutritionData.proteins}g</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2">Gorduras Totais</td>
                    <td className="text-right p-2">{nutritionData.total_fat}g</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2 pl-6 text-muted-foreground">Gorduras Saturadas</td>
                    <td className="text-right p-2">{nutritionData.saturated_fat}g</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2 pl-6 text-muted-foreground">Gorduras Trans</td>
                    <td className="text-right p-2">{nutritionData.trans_fat}g</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2">Fibra Alimentar</td>
                    <td className="text-right p-2">{nutritionData.fiber}g</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2">Sódio</td>
                    <td className="text-right p-2">{nutritionData.sodium}mg</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-amber-800 dark:text-amber-200">
                {nutritionData.disclaimer}
              </p>
            </div>

            <Button onClick={handleUseNutrition} className="w-full">
              Usar Esta Tabela Nutricional
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NutritionGenerator;
