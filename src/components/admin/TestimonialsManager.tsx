import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, MessageSquareQuote, Star } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Testimonial {
  id: string;
  name: string;
  location: string | null;
  rating: number;
  text: string;
  avatar_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
}

const TestimonialsManager = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    rating: 5,
    text: "",
    avatar_url: "",
    is_active: true,
    is_featured: false,
    sort_order: 0,
  });

  const fetchTestimonials = async () => {
    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar depoimentos");
      return;
    }
    setTestimonials(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      location: "",
      rating: 5,
      text: "",
      avatar_url: "",
      is_active: true,
      is_featured: false,
      sort_order: 0,
    });
    setEditingTestimonial(null);
  };

  const openEditDialog = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setFormData({
      name: testimonial.name,
      location: testimonial.location || "",
      rating: testimonial.rating,
      text: testimonial.text,
      avatar_url: testimonial.avatar_url || "",
      is_active: testimonial.is_active,
      is_featured: testimonial.is_featured,
      sort_order: testimonial.sort_order,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.text.trim()) {
      toast.error("Nome e depoimento são obrigatórios");
      return;
    }

    const testimonialData = {
      name: formData.name,
      location: formData.location || null,
      rating: formData.rating,
      text: formData.text,
      avatar_url: formData.avatar_url || null,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
      sort_order: formData.sort_order,
    };

    if (editingTestimonial) {
      const { error } = await supabase
        .from("testimonials")
        .update(testimonialData)
        .eq("id", editingTestimonial.id);

      if (error) {
        toast.error("Erro ao atualizar depoimento");
        return;
      }
      toast.success("Depoimento atualizado!");
    } else {
      const { error } = await supabase
        .from("testimonials")
        .insert(testimonialData);

      if (error) {
        toast.error("Erro ao criar depoimento");
        return;
      }
      toast.success("Depoimento criado!");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchTestimonials();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este depoimento?")) return;

    const { error } = await supabase
      .from("testimonials")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir depoimento");
      return;
    }
    toast.success("Depoimento excluído!");
    fetchTestimonials();
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from("testimonials")
      .update({ is_active: !currentState })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    fetchTestimonials();
  };

  const toggleFeatured = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from("testimonials")
      .update({ is_featured: !currentState })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar destaque");
      return;
    }
    fetchTestimonials();
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
          <h2 className="text-2xl font-bold">Depoimentos</h2>
          <p className="text-muted-foreground">Gerencie os depoimentos do site</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Depoimento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTestimonial ? "Editar Depoimento" : "Novo Depoimento"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do cliente"
                  />
                </div>
                <div>
                  <Label>Localização</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="São Paulo, SP"
                  />
                </div>
              </div>
              <div>
                <Label>Avaliação (1-5)</Label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= formData.rating
                            ? "fill-accent text-accent"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Depoimento</Label>
                <Textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  placeholder="O que o cliente disse..."
                  rows={4}
                />
              </div>
              <div>
                <Label>URL do Avatar</Label>
                <Input
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Ativo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  />
                  <Label>Destaque</Label>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingTestimonial ? "Salvar Alterações" : "Criar Depoimento"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {testimonials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquareQuote className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum depoimento cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Avaliação</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Destaque</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testimonials.map((testimonial) => (
                <TableRow key={testimonial.id}>
                  <TableCell className="font-medium">{testimonial.name}</TableCell>
                  <TableCell className="text-muted-foreground">{testimonial.location || "-"}</TableCell>
                  <TableCell>
                    <div className="flex">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={testimonial.is_active}
                      onCheckedChange={() => toggleActive(testimonial.id, testimonial.is_active)}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={testimonial.is_featured}
                      onCheckedChange={() => toggleFeatured(testimonial.id, testimonial.is_featured)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(testimonial)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(testimonial.id)}
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

export default TestimonialsManager;
