import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Loader2,
  ImageIcon,
  X,
  Star,
  Trash2,
  GripVertical,
  Package,
  Camera,
  ArrowLeft,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  additional_images: string[] | null;
}

interface ProductPhotosManagerProps {
  productId?: string;
  onBack?: () => void;
}

const ProductPhotosManager = ({ productId, onBack }: ProductPhotosManagerProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<{ url: string; isMain: boolean } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainImageInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, image_url, additional_images")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setIsLoading(false);
    }
  };

  useState(() => {
    fetchProducts();
  });

  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setSelectedProduct(product || null);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione apenas imagens");
      return null;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return null;
    }

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao enviar imagem");
      return null;
    }
  };

  const handleMainImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProduct) return;

    setIsUploading(true);
    try {
      const imageUrl = await uploadImage(file);
      if (!imageUrl) return;

      const { error } = await supabase
        .from("products")
        .update({ image_url: imageUrl })
        .eq("id", selectedProduct.id);

      if (error) throw error;

      setSelectedProduct((prev) => prev ? { ...prev, image_url: imageUrl } : null);
      toast.success("Foto principal atualizada!");
      fetchProducts();
    } finally {
      setIsUploading(false);
      if (mainImageInputRef.current) {
        mainImageInputRef.current.value = "";
      }
    }
  };

  const handleAdditionalImagesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedProduct) return;

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const url = await uploadImage(file);
        if (url) uploadedUrls.push(url);
      }

      if (uploadedUrls.length === 0) return;

      const currentImages = selectedProduct.additional_images || [];
      const newImages = [...currentImages, ...uploadedUrls];

      const { error } = await supabase
        .from("products")
        .update({ additional_images: newImages })
        .eq("id", selectedProduct.id);

      if (error) throw error;

      setSelectedProduct((prev) =>
        prev ? { ...prev, additional_images: newImages } : null
      );
      toast.success(`${uploadedUrls.length} foto(s) adicionada(s)!`);
      fetchProducts();
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteImage = async () => {
    if (!imageToDelete || !selectedProduct) return;

    setIsSaving(true);
    try {
      if (imageToDelete.isMain) {
        const { error } = await supabase
          .from("products")
          .update({ image_url: null })
          .eq("id", selectedProduct.id);

        if (error) throw error;
        setSelectedProduct((prev) => prev ? { ...prev, image_url: null } : null);
      } else {
        const currentImages = selectedProduct.additional_images || [];
        const newImages = currentImages.filter((url) => url !== imageToDelete.url);

        const { error } = await supabase
          .from("products")
          .update({ additional_images: newImages })
          .eq("id", selectedProduct.id);

        if (error) throw error;
        setSelectedProduct((prev) =>
          prev ? { ...prev, additional_images: newImages } : null
        );
      }

      toast.success("Foto removida com sucesso!");
      fetchProducts();
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Erro ao remover foto");
    } finally {
      setIsSaving(false);
      setIsDeleteDialogOpen(false);
      setImageToDelete(null);
    }
  };

  const setAsMainImage = async (url: string) => {
    if (!selectedProduct) return;

    setIsSaving(true);
    try {
      const currentMain = selectedProduct.image_url;
      const currentAdditional = selectedProduct.additional_images || [];

      // Remove the new main from additional
      const newAdditional = currentAdditional.filter((u) => u !== url);
      
      // Add old main to additional if it exists
      if (currentMain) {
        newAdditional.unshift(currentMain);
      }

      const { error } = await supabase
        .from("products")
        .update({
          image_url: url,
          additional_images: newAdditional,
        })
        .eq("id", selectedProduct.id);

      if (error) throw error;

      setSelectedProduct((prev) =>
        prev
          ? {
              ...prev,
              image_url: url,
              additional_images: newAdditional,
            }
          : null
      );
      toast.success("Foto principal atualizada!");
      fetchProducts();
    } catch (error) {
      console.error("Error setting main image:", error);
      toast.error("Erro ao definir foto principal");
    } finally {
      setIsSaving(false);
    }
  };

  const totalImages =
    (selectedProduct?.image_url ? 1 : 0) +
    (selectedProduct?.additional_images?.length || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold">Fotos do Produto</h2>
            <p className="text-muted-foreground">
              Gerencie foto principal e fotos adicionais
            </p>
          </div>
        </div>
      </div>

      {/* Product Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selecione o Produto</CardTitle>
          <CardDescription>
            Escolha um produto para gerenciar suas fotos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedProduct?.id || ""}
            onValueChange={handleProductSelect}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um produto" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  <div className="flex items-center gap-2">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt=""
                        className="w-6 h-6 rounded object-cover"
                      />
                    ) : (
                      <Package className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{product.name}</span>
                    <Badge variant="outline" className="ml-auto">
                      {(product.additional_images?.length || 0) + (product.image_url ? 1 : 0)} fotos
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProduct && (
        <>
          {/* Main Image */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <CardTitle className="text-lg">Foto Principal</CardTitle>
                </div>
                <input
                  type="file"
                  ref={mainImageInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleMainImageUpload}
                />
                <Button
                  variant="outline"
                  onClick={() => mainImageInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Camera className="h-4 w-4 mr-2" />
                  )}
                  {selectedProduct.image_url ? "Trocar Foto" : "Adicionar Foto"}
                </Button>
              </div>
              <CardDescription>
                Esta é a foto exibida na listagem de produtos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedProduct.image_url ? (
                <div className="relative group w-fit">
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className="w-48 h-48 object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      setImageToDelete({ url: selectedProduct.image_url!, isMain: true });
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Badge className="absolute bottom-2 left-2">Principal</Badge>
                </div>
              ) : (
                <div
                  className="w-48 h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:border-primary transition-colors"
                  onClick={() => mainImageInputRef.current?.click()}
                >
                  <ImageIcon className="h-12 w-12 mb-2" />
                  <span className="text-sm">Clique para adicionar</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Images */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Fotos Adicionais</CardTitle>
                  <CardDescription>
                    Adicione mais fotos para mostrar detalhes do produto
                  </CardDescription>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleAdditionalImagesUpload}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Adicionar Fotos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedProduct.additional_images &&
              selectedProduct.additional_images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {selectedProduct.additional_images.map((url, index) => (
                    <div key={url} className="relative group">
                      <img
                        src={url}
                        alt={`${selectedProduct.name} - Foto ${index + 2}`}
                        className="w-full aspect-square object-cover rounded-lg border"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => setAsMainImage(url)}
                          disabled={isSaving}
                          title="Definir como principal"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            setImageToDelete({ url, isMain: false });
                            setIsDeleteDialogOpen(true);
                          }}
                          title="Remover foto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Badge
                        variant="secondary"
                        className="absolute bottom-2 left-2 text-xs"
                      >
                        {index + 2}
                      </Badge>
                    </div>
                  ))}

                  {/* Add More Button */}
                  <div
                    className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mb-2" />
                    <span className="text-xs">Adicionar</span>
                  </div>
                </div>
              ) : (
                <div
                  className="py-12 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 mb-4" />
                  <h3 className="font-semibold mb-1">Nenhuma foto adicional</h3>
                  <p className="text-sm">Clique para adicionar mais fotos</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Camera className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{totalImages} foto(s) cadastrada(s)</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedProduct.image_url ? "1 principal" : "Sem foto principal"}
                      {selectedProduct.additional_images &&
                        selectedProduct.additional_images.length > 0 &&
                        ` + ${selectedProduct.additional_images.length} adicional(is)`}
                    </div>
                  </div>
                </div>
                <Badge variant={totalImages >= 3 ? "default" : "secondary"}>
                  {totalImages >= 3 ? "Completo" : "Recomendado: 3+ fotos"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover esta foto? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {imageToDelete && (
            <div className="flex justify-center py-4">
              <img
                src={imageToDelete.url}
                alt="Foto a ser excluída"
                className="w-32 h-32 object-cover rounded-lg border"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteImage} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover Foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductPhotosManager;
