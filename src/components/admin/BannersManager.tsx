import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, GripVertical, Eye, EyeOff, Image, ExternalLink, Upload, Link } from "lucide-react";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  button_text: string | null;
  sort_order: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
}

const BannersManager = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">("upload");

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    image_url: "",
    link_url: "",
    button_text: "",
    is_active: true,
    start_date: "",
    end_date: "",
  });

  const fetchBanners = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("promotional_banners")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error("Error fetching banners:", error);
      toast.error("Erro ao carregar banners");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const openCreateDialog = () => {
    setEditingBanner(null);
    setFormData({
      title: "",
      subtitle: "",
      image_url: "",
      link_url: "",
      button_text: "Saiba Mais",
      is_active: true,
      start_date: "",
      end_date: "",
    });
    setImageFile(null);
    setImagePreview(null);
    setImageInputMode("upload");
    setIsDialogOpen(true);
  };

  const openEditDialog = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || "",
      image_url: banner.image_url || "",
      link_url: banner.link_url || "",
      button_text: banner.button_text || "",
      is_active: banner.is_active,
      start_date: banner.start_date ? banner.start_date.split("T")[0] : "",
      end_date: banner.end_date ? banner.end_date.split("T")[0] : "",
    });
    setImageFile(null);
    setImagePreview(banner.image_url);
    setImageInputMode(banner.image_url ? "url" : "upload");
    setIsDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setFormData({ ...formData, image_url: "" });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (url: string) => {
    setFormData({ ...formData, image_url: url });
    setImageFile(null);
    setImagePreview(url || null);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `banner-${Date.now()}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!formData.title) {
      toast.error("Título é obrigatório");
      return;
    }

    setIsSaving(true);
    try {
      let imageUrl = formData.image_url;

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const data = {
        title: formData.title,
        subtitle: formData.subtitle || null,
        image_url: imageUrl || null,
        link_url: formData.link_url || null,
        button_text: formData.button_text || null,
        is_active: formData.is_active,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        sort_order: editingBanner?.sort_order ?? banners.length,
      };

      if (editingBanner) {
        const { error } = await supabase
          .from("promotional_banners")
          .update(data)
          .eq("id", editingBanner.id);
        if (error) throw error;
        toast.success("Banner atualizado!");
      } else {
        const { error } = await supabase.from("promotional_banners").insert(data);
        if (error) throw error;
        toast.success("Banner criado!");
      }

      setIsDialogOpen(false);
      fetchBanners();
    } catch (error) {
      console.error("Error saving banner:", error);
      toast.error("Erro ao salvar banner");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este banner?")) return;

    try {
      const { error } = await supabase.from("promotional_banners").delete().eq("id", id);
      if (error) throw error;
      toast.success("Banner excluído!");
      fetchBanners();
    } catch (error) {
      console.error("Error deleting banner:", error);
      toast.error("Erro ao excluir banner");
    }
  };

  const toggleActive = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from("promotional_banners")
        .update({ is_active: !banner.is_active })
        .eq("id", banner.id);
      if (error) throw error;
      toast.success(banner.is_active ? "Banner desativado" : "Banner ativado");
      fetchBanners();
    } catch (error) {
      console.error("Error toggling banner:", error);
      toast.error("Erro ao alterar status");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Banners Promocionais</h2>
          <p className="text-muted-foreground">Gerencie o carrossel de banners do site</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Banner
        </Button>
      </div>

      {/* Active Banners Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview do Carrossel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-hidden rounded-lg aspect-[3/1] bg-muted">
            {banners.filter(b => b.is_active).length > 0 ? (
              <div className="flex overflow-x-auto gap-4 p-4">
                {banners
                  .filter(b => b.is_active)
                  .map((banner) => (
                    <div
                      key={banner.id}
                      className="relative flex-shrink-0 w-80 h-40 rounded-lg overflow-hidden"
                    >
                      {banner.image_url ? (
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
                          <Image className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-4">
                        <h3 className="text-white font-bold">{banner.title}</h3>
                        {banner.subtitle && (
                          <p className="text-white/80 text-sm">{banner.subtitle}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Nenhum banner ativo
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Banners Table */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Banners</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((banner) => (
                <TableRow key={banner.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  </TableCell>
                  <TableCell>
                    {banner.image_url ? (
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="w-20 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-20 h-12 bg-muted rounded flex items-center justify-center">
                        <Image className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{banner.title}</div>
                      {banner.subtitle && (
                        <div className="text-sm text-muted-foreground">{banner.subtitle}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {banner.link_url && (
                      <a
                        href={banner.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Link
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {banner.start_date && (
                        <div>Início: {new Date(banner.start_date).toLocaleDateString("pt-BR")}</div>
                      )}
                      {banner.end_date && (
                        <div>Fim: {new Date(banner.end_date).toLocaleDateString("pt-BR")}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={banner.is_active ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleActive(banner)}
                    >
                      {banner.is_active ? (
                        <><Eye className="h-4 w-4 mr-1" /> Ativo</>
                      ) : (
                        <><EyeOff className="h-4 w-4 mr-1" /> Inativo</>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(banner)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(banner.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {banners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum banner cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBanner ? "Editar Banner" : "Novo Banner"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image Input - Upload or URL */}
            <div>
              <Label>Imagem do Banner</Label>
              <Tabs value={imageInputMode} onValueChange={(v) => setImageInputMode(v as "upload" | "url")} className="mt-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Carregar Arquivo
                  </TabsTrigger>
                  <TabsTrigger value="url" className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    URL da Imagem
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-3">
                  {imagePreview && imageInputMode === "upload" ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                          setFormData({ ...formData, image_url: "" });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Clique para selecionar arquivo</span>
                      <span className="text-xs text-muted-foreground mt-1">JPG, PNG ou WebP</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                </TabsContent>

                <TabsContent value="url" className="mt-3 space-y-3">
                  <Input
                    placeholder="https://exemplo.com/imagem.jpg"
                    value={formData.image_url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                  />
                  {imagePreview && imageInputMode === "url" && (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-lg"
                        onError={() => setImagePreview(null)}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => handleUrlChange("")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <div>
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Promoção de Verão"
              />
            </div>

            <div>
              <Label>Subtítulo</Label>
              <Input
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Ex: Até 50% de desconto"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Texto do Botão</Label>
                <Input
                  value={formData.button_text}
                  onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                  placeholder="Saiba Mais"
                />
              </div>
              <div>
                <Label>Link do Botão</Label>
                <Input
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  placeholder="/promocoes"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Data de Término</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="banner_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="banner_active">Banner Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingBanner ? "Salvar" : "Criar Banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BannersManager;
