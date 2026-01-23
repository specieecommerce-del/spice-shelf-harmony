import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Receipt, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Expense {
  id: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  invoice_number: string | null;
  invoice_url: string | null;
  is_recurring: boolean;
  recurrence_period: string | null;
}

const expenseCategories = [
  "Aluguel",
  "Energia",
  "Água",
  "Internet",
  "Telefone",
  "Salários",
  "Fornecedores",
  "Marketing",
  "Transporte",
  "Embalagens",
  "Impostos",
  "Manutenção",
  "Outros",
];

const ExpensesManager = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    type: "fixed",
    category: "Outros",
    description: "",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    invoice_number: "",
    invoice_url: "",
    is_recurring: false,
    recurrence_period: "monthly",
  });

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar despesas");
      return;
    }
    setExpenses(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const resetForm = () => {
    setFormData({
      type: "fixed",
      category: "Outros",
      description: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      invoice_number: "",
      invoice_url: "",
      is_recurring: false,
      recurrence_period: "monthly",
    });
    setEditingExpense(null);
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      type: expense.type,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      date: expense.date,
      invoice_number: expense.invoice_number || "",
      invoice_url: expense.invoice_url || "",
      is_recurring: expense.is_recurring,
      recurrence_period: expense.recurrence_period || "monthly",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.description.trim() || formData.amount <= 0) {
      toast.error("Descrição e valor são obrigatórios");
      return;
    }

    const expenseData = {
      type: formData.type,
      category: formData.category,
      description: formData.description,
      amount: formData.amount,
      date: formData.date,
      invoice_number: formData.invoice_number || null,
      invoice_url: formData.invoice_url || null,
      is_recurring: formData.is_recurring,
      recurrence_period: formData.is_recurring ? formData.recurrence_period : null,
    };

    if (editingExpense) {
      const { error } = await supabase
        .from("expenses")
        .update(expenseData)
        .eq("id", editingExpense.id);

      if (error) {
        toast.error("Erro ao atualizar despesa");
        return;
      }
      toast.success("Despesa atualizada!");
    } else {
      const { error } = await supabase
        .from("expenses")
        .insert(expenseData);

      if (error) {
        toast.error("Erro ao criar despesa");
        return;
      }
      toast.success("Despesa registrada!");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchExpenses();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta despesa?")) return;

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir despesa");
      return;
    }
    toast.success("Despesa excluída!");
    fetchExpenses();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalFixed = expenses.filter(e => e.type === "fixed").reduce((sum, e) => sum + e.amount, 0);
  const totalVariable = expenses.filter(e => e.type === "variable").reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = totalFixed + totalVariable;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Custos e Gastos</h2>
          <p className="text-muted-foreground">Controle de despesas fixas e variáveis</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? "Editar Despesa" : "Nova Despesa"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Custo Fixo</SelectItem>
                      <SelectItem value="variable">Custo Variável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da despesa"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nº da Nota Fiscal</Label>
                  <Input
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <Label>URL da Nota</Label>
                  <Input
                    value={formData.invoice_url}
                    onChange={(e) => setFormData({ ...formData, invoice_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_recurring}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                  />
                  <Label>Despesa Recorrente</Label>
                </div>
                {formData.is_recurring && (
                  <Select
                    value={formData.recurrence_period}
                    onValueChange={(value) => setFormData({ ...formData, recurrence_period: value })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingExpense ? "Salvar Alterações" : "Registrar Despesa"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custos Fixos</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalFixed)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custos Variáveis</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalVariable)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>
      </div>

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma despesa registrada</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    {format(new Date(expense.date), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={expense.type === "fixed" ? "secondary" : "outline"}>
                      {expense.type === "fixed" ? "Fixo" : "Variável"}
                    </Badge>
                  </TableCell>
                  <TableCell>{expense.category}</TableCell>
                  <TableCell className="font-medium">{expense.description}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(expense)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default ExpensesManager;
