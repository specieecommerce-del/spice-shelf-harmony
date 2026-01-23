import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, FolderOpen } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

const CategoriesManager = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    is_active: true,
    sort_order: 0,
  });

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("product_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar categorias");
      return;
    }
    setCategories(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: editingCategory ? formData.slug : generateSlug(name),
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      image_url: "",
      is_active: true,
      sort_order: 0,
    });
    setEditingCategory(null);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      image_url: category.image_url || "",
      is_active: category.is_active,
      sort_order: category.sort_order,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }

    if (editingCategory) {
      const { error } = await supabase
        .from("product_categories")
        .update(formData)
        .eq("id", editingCategory.id);

      if (error) {
        toast.error("Erro ao atualizar categoria");
        return;
      }
      toast.success("Categoria atualizada!");
    } else {
      const { error } = await supabase
        .from("product_categories")
        .insert(formData);

      if (error) {
        toast.error("Erro ao criar categoria");
        return;
      }
      toast.success("Categoria criada!");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;

    const { error } = await supabase
      .from("product_categories")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir categoria");
      return;
    }
    toast.success("Categoria excluída!");
    fetchCategories();
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from("product_categories")
      .update({ is_active: !currentState })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    fetchCategories();
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Categorias</h2>
          <p className="text-muted-foreground">Gerencie as categorias de produtos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Editar Categoria" : "Nova Categoria"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Nome da categoria"
                />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="slug-da-categoria"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da categoria"
                />
              </div>
              <div>
                <Label>URL da Imagem</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Categoria ativa</Label>
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingCategory ? "Salvar Alterações" : "Criar Categoria"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma categoria cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                  <TableCell>{category.sort_order}</TableCell>
                  <TableCell>
                    <Switch
                      checked={category.is_active}
                      onCheckedChange={() => toggleActive(category.id, category.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(category.id)}
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

export default CategoriesManager;
