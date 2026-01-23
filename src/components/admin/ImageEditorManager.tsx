import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Image, Upload, Trash2, Loader2, Sun, Contrast, Palette, 
  RotateCcw, Crop, Move, RefreshCw, Download, Eye, Pencil,
  ZoomIn, ZoomOut, FlipHorizontal, FlipVertical
} from "lucide-react";

interface SiteImage {
  id: string;
  url: string;
  type: "product" | "banner" | "background" | "category" | "recipe" | "testimonial" | "site_content";
  name: string;
  source_table: string;
  source_id: string;
  source_field: string;
}

interface ImageFilters {
  brightness: number;
  contrast: number;
  saturate: number;
  hue: number;
  blur: number;
  grayscale: number;
  sepia: number;
}

const defaultFilters: ImageFilters = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hue: 0,
  blur: 0,
  grayscale: 0,
  sepia: 0,
};

const ImageEditorManager = () => {
  const [images, setImages] = useState<SiteImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<SiteImage | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filters, setFilters] = useState<ImageFilters>(defaultFilters);
  const [scale, setScale] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchAllImages();
  }, []);

  const fetchAllImages = async () => {
    setIsLoading(true);
    try {
      const allImages: SiteImage[] = [];

      // Fetch product images
      const { data: products } = await supabase
        .from("products")
        .select("id, name, image_url, additional_images");
      
      products?.forEach(product => {
        if (product.image_url) {
          allImages.push({
            id: `product-main-${product.id}`,
            url: product.image_url,
            type: "product",
            name: `${product.name} (Principal)`,
            source_table: "products",
            source_id: product.id,
            source_field: "image_url",
          });
        }
        product.additional_images?.forEach((img: string, idx: number) => {
          allImages.push({
            id: `product-add-${product.id}-${idx}`,
            url: img,
            type: "product",
            name: `${product.name} (Adicional ${idx + 1})`,
            source_table: "products",
            source_id: product.id,
            source_field: `additional_images[${idx}]`,
          });
        });
      });

      // Fetch banner images
      const { data: banners } = await supabase
        .from("promotional_banners")
        .select("id, title, image_url");
      
      banners?.forEach(banner => {
        if (banner.image_url) {
          allImages.push({
            id: `banner-${banner.id}`,
            url: banner.image_url,
            type: "banner",
            name: banner.title,
            source_table: "promotional_banners",
            source_id: banner.id,
            source_field: "image_url",
          });
        }
      });

      // Fetch category images
      const { data: categories } = await supabase
        .from("product_categories")
        .select("id, name, image_url");
      
      categories?.forEach(category => {
        if (category.image_url) {
          allImages.push({
            id: `category-${category.id}`,
            url: category.image_url,
            type: "category",
            name: category.name,
            source_table: "product_categories",
            source_id: category.id,
            source_field: "image_url",
          });
        }
      });

      // Fetch recipe images
      const { data: recipes } = await supabase
        .from("recipes")
        .select("id, title, image_url");
      
      recipes?.forEach(recipe => {
        if (recipe.image_url) {
          allImages.push({
            id: `recipe-${recipe.id}`,
            url: recipe.image_url,
            type: "recipe",
            name: recipe.title,
            source_table: "recipes",
            source_id: recipe.id,
            source_field: "image_url",
          });
        }
      });

      // Fetch testimonial images
      const { data: testimonials } = await supabase
        .from("testimonials")
        .select("id, name, avatar_url");
      
      testimonials?.forEach(testimonial => {
        if (testimonial.avatar_url) {
          allImages.push({
            id: `testimonial-${testimonial.id}`,
            url: testimonial.avatar_url,
            type: "testimonial",
            name: testimonial.name,
            source_table: "testimonials",
            source_id: testimonial.id,
            source_field: "avatar_url",
          });
        }
      });

      // Fetch promotion banner images
      const { data: promotions } = await supabase
        .from("promotions")
        .select("id, name, banner_image_url");
      
      promotions?.forEach(promo => {
        if (promo.banner_image_url) {
          allImages.push({
            id: `promotion-${promo.id}`,
            url: promo.banner_image_url,
            type: "banner",
            name: `Promoção: ${promo.name}`,
            source_table: "promotions",
            source_id: promo.id,
            source_field: "banner_image_url",
          });
        }
      });

      setImages(allImages);
    } catch (error) {
      console.error("Error fetching images:", error);
      toast.error("Erro ao carregar imagens");
    } finally {
      setIsLoading(false);
    }
  };

  const openEditor = (image: SiteImage) => {
    setSelectedImage(image);
    setFilters(defaultFilters);
    setScale(100);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setNewImageUrl("");
    setIsEditorOpen(true);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setScale(100);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  };

  const getFilterStyle = () => {
    return {
      filter: `
        brightness(${filters.brightness}%)
        contrast(${filters.contrast}%)
        saturate(${filters.saturate}%)
        hue-rotate(${filters.hue}deg)
        blur(${filters.blur}px)
        grayscale(${filters.grayscale}%)
        sepia(${filters.sepia}%)
      `,
      transform: `
        scale(${scale / 100})
        rotate(${rotation}deg)
        scaleX(${flipH ? -1 : 1})
        scaleY(${flipV ? -1 : 1})
      `,
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedImage) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `edited/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      setNewImageUrl(urlData.publicUrl);
      toast.success("Imagem carregada com sucesso!");
    } catch (error) {
      console.error("Error uploading:", error);
      toast.error("Erro ao carregar imagem");
    } finally {
      setIsUploading(false);
    }
  };

  const applyEditedImage = async () => {
    if (!selectedImage) return;

    // If we have a new image URL, use that. Otherwise, we'd need to apply filters server-side
    // For now, we'll just update the URL if a new image was uploaded
    if (!newImageUrl) {
      toast.info("Faça upload de uma nova imagem para substituir a atual");
      return;
    }

    setIsSaving(true);
    try {
      // Handle additional_images array specially
      if (selectedImage.source_field.startsWith("additional_images[")) {
        const match = selectedImage.source_field.match(/\[(\d+)\]/);
        if (match) {
          const idx = parseInt(match[1]);
          const { data: product } = await supabase
            .from("products")
            .select("additional_images")
            .eq("id", selectedImage.source_id)
            .single();
          
          if (product?.additional_images) {
            const newImages = [...product.additional_images];
            newImages[idx] = newImageUrl;
            
            const { error } = await supabase
              .from("products")
              .update({ additional_images: newImages })
              .eq("id", selectedImage.source_id);
            
            if (error) throw error;
          }
        }
      } else {
        const { error } = await supabase
          .from(selectedImage.source_table as "products" | "promotional_banners" | "product_categories" | "recipes" | "testimonials" | "promotions")
          .update({ [selectedImage.source_field]: newImageUrl })
          .eq("id", selectedImage.source_id);

        if (error) throw error;
      }

      toast.success("Imagem atualizada com sucesso!");
      setIsEditorOpen(false);
      fetchAllImages();
    } catch (error) {
      console.error("Error updating image:", error);
      toast.error("Erro ao atualizar imagem");
    } finally {
      setIsSaving(false);
    }
  };

  const downloadEditedImage = () => {
    if (!selectedImage) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.filter = `
        brightness(${filters.brightness}%)
        contrast(${filters.contrast}%)
        saturate(${filters.saturate}%)
        hue-rotate(${filters.hue}deg)
        grayscale(${filters.grayscale}%)
        sepia(${filters.sepia}%)
      `;
      
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      const link = document.createElement("a");
      link.download = `edited-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = newImageUrl || selectedImage.url;
  };

  const filteredImages = images.filter(img => {
    if (activeTab === "all") return true;
    return img.type === activeTab;
  });

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      product: "Produtos",
      banner: "Banners",
      background: "Fundos",
      category: "Categorias",
      recipe: "Receitas",
      testimonial: "Depoimentos",
      site_content: "Conteúdo",
    };
    return labels[type] || type;
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      product: "bg-blue-100 text-blue-700",
      banner: "bg-purple-100 text-purple-700",
      background: "bg-green-100 text-green-700",
      category: "bg-orange-100 text-orange-700",
      recipe: "bg-pink-100 text-pink-700",
      testimonial: "bg-yellow-100 text-yellow-700",
      site_content: "bg-gray-100 text-gray-700",
    };
    return colors[type] || "bg-gray-100 text-gray-700";
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
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Image className="h-6 w-6" />
          Editor Universal de Imagens
        </h2>
        <p className="text-muted-foreground">
          Edite qualquer imagem do site: produtos, banners, categorias, receitas e mais.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {["all", "product", "banner", "category", "recipe", "testimonial"].map((type) => (
          <Card 
            key={type} 
            className={`cursor-pointer transition-all ${activeTab === type ? "ring-2 ring-primary" : ""}`}
            onClick={() => setActiveTab(type)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">
                {type === "all" 
                  ? images.length 
                  : images.filter(i => i.type === type).length}
              </div>
              <p className="text-xs text-muted-foreground">
                {type === "all" ? "Todas" : getTypeLabel(type)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Images Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Galeria de Imagens ({filteredImages.length})</CardTitle>
          <CardDescription>
            Clique em uma imagem para editá-la
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                className="group relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => openEditor(image)}
              >
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <Pencil className="h-6 w-6 text-white" />
                  <span className="text-white text-sm font-medium text-center px-2">
                    Editar
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${getTypeBadgeColor(image.type)}`}>
                    {getTypeLabel(image.type)}
                  </span>
                  <p className="text-white text-xs mt-1 truncate">{image.name}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredImages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma imagem encontrada nesta categoria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Editar Imagem: {selectedImage?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Preview */}
            <div className="space-y-4">
              <div className="relative aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src={newImageUrl || selectedImage?.url}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain transition-all duration-200"
                  style={getFilterStyle()}
                />
              </div>
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Upload New Image */}
              <div className="space-y-2">
                <Label>Substituir Imagem</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload Nova Imagem
                  </Button>
                  <Button
                    variant="outline"
                    onClick={downloadEditedImage}
                    title="Baixar imagem editada"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                {newImageUrl && (
                  <p className="text-sm text-green-600">✓ Nova imagem carregada</p>
                )}
              </div>

              {/* URL Input */}
              <div className="space-y-2">
                <Label>Ou insira URL da imagem</Label>
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Editor Controls */}
            <div className="space-y-6">
              <Tabs defaultValue="adjustments">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="adjustments">Ajustes</TabsTrigger>
                  <TabsTrigger value="transform">Transformar</TabsTrigger>
                  <TabsTrigger value="effects">Efeitos</TabsTrigger>
                </TabsList>

                <TabsContent value="adjustments" className="space-y-4 mt-4">
                  {/* Brightness */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Brilho
                      </Label>
                      <span className="text-sm text-muted-foreground">{filters.brightness}%</span>
                    </div>
                    <Slider
                      value={[filters.brightness]}
                      onValueChange={([v]) => setFilters({ ...filters, brightness: v })}
                      min={0}
                      max={200}
                      step={1}
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Contrast className="h-4 w-4" />
                        Contraste
                      </Label>
                      <span className="text-sm text-muted-foreground">{filters.contrast}%</span>
                    </div>
                    <Slider
                      value={[filters.contrast]}
                      onValueChange={([v]) => setFilters({ ...filters, contrast: v })}
                      min={0}
                      max={200}
                      step={1}
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Saturação
                      </Label>
                      <span className="text-sm text-muted-foreground">{filters.saturate}%</span>
                    </div>
                    <Slider
                      value={[filters.saturate]}
                      onValueChange={([v]) => setFilters({ ...filters, saturate: v })}
                      min={0}
                      max={200}
                      step={1}
                    />
                  </div>

                  {/* Hue Rotate */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Matiz (Hue)</Label>
                      <span className="text-sm text-muted-foreground">{filters.hue}°</span>
                    </div>
                    <Slider
                      value={[filters.hue]}
                      onValueChange={([v]) => setFilters({ ...filters, hue: v })}
                      min={0}
                      max={360}
                      step={1}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="transform" className="space-y-4 mt-4">
                  {/* Scale */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <ZoomIn className="h-4 w-4" />
                        Escala
                      </Label>
                      <span className="text-sm text-muted-foreground">{scale}%</span>
                    </div>
                    <Slider
                      value={[scale]}
                      onValueChange={([v]) => setScale(v)}
                      min={10}
                      max={200}
                      step={1}
                    />
                  </div>

                  {/* Rotation */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Rotação
                      </Label>
                      <span className="text-sm text-muted-foreground">{rotation}°</span>
                    </div>
                    <Slider
                      value={[rotation]}
                      onValueChange={([v]) => setRotation(v)}
                      min={0}
                      max={360}
                      step={1}
                    />
                  </div>

                  {/* Flip Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant={flipH ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setFlipH(!flipH)}
                    >
                      <FlipHorizontal className="h-4 w-4 mr-2" />
                      Espelhar H
                    </Button>
                    <Button
                      variant={flipV ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setFlipV(!flipV)}
                    >
                      <FlipVertical className="h-4 w-4 mr-2" />
                      Espelhar V
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="effects" className="space-y-4 mt-4">
                  {/* Blur */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Desfoque</Label>
                      <span className="text-sm text-muted-foreground">{filters.blur}px</span>
                    </div>
                    <Slider
                      value={[filters.blur]}
                      onValueChange={([v]) => setFilters({ ...filters, blur: v })}
                      min={0}
                      max={10}
                      step={0.5}
                    />
                  </div>

                  {/* Grayscale */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Preto e Branco</Label>
                      <span className="text-sm text-muted-foreground">{filters.grayscale}%</span>
                    </div>
                    <Slider
                      value={[filters.grayscale]}
                      onValueChange={([v]) => setFilters({ ...filters, grayscale: v })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>

                  {/* Sepia */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Sépia</Label>
                      <span className="text-sm text-muted-foreground">{filters.sepia}%</span>
                    </div>
                    <Slider
                      value={[filters.sepia]}
                      onValueChange={([v]) => setFilters({ ...filters, sepia: v })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Reset Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={resetFilters}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Resetar Ajustes
              </Button>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={applyEditedImage} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageEditorManager;
