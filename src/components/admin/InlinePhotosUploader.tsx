import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Camera,
  Upload,
  Loader2,
  X,
  Star,
  Image as ImageIcon,
  GripVertical,
  Link2,
} from "lucide-react";

interface ProductImage {
  url: string;
  isMain: boolean;
  isNew?: boolean;
}

interface InlinePhotosUploaderProps {
  mainImage: string;
  additionalImages: string[];
  onMainImageChange: (url: string) => void;
  onAdditionalImagesChange: (urls: string[]) => void;
  disabled?: boolean;
}

const InlinePhotosUploader = ({
  mainImage,
  additionalImages,
  onMainImageChange,
  onAdditionalImagesChange,
  disabled = false,
}: InlinePhotosUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return null;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 10MB");
      return null;
    }

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  const handleMainImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const url = await uploadImage(file);
    setIsUploading(false);

    if (url) {
      onMainImageChange(url);
      toast.success("Imagem principal enviada!");
    } else {
      toast.error("Erro ao enviar imagem");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleMultipleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const maxFiles = 50 - additionalImages.length;
    if (files.length > maxFiles) {
      toast.error(`Máximo de ${maxFiles} imagens adicionais permitidas`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const newUrls: string[] = [];
    let completed = 0;

    for (const file of Array.from(files)) {
      const url = await uploadImage(file);
      if (url) newUrls.push(url);
      completed++;
      setUploadProgress(Math.round((completed / files.length) * 100));
    }

    setIsUploading(false);
    setUploadProgress(0);

    if (newUrls.length > 0) {
      onAdditionalImagesChange([...additionalImages, ...newUrls]);
      toast.success(`${newUrls.length} imagem(ns) enviada(s)!`);
    }

    if (multiFileInputRef.current) multiFileInputRef.current.value = "";
  };

  const addImageFromUrl = () => {
    if (!urlInput.trim()) return;

    try {
      new URL(urlInput); // Validate URL
      if (!mainImage) {
        onMainImageChange(urlInput);
      } else {
        onAdditionalImagesChange([...additionalImages, urlInput]);
      }
      setUrlInput("");
      setShowUrlInput(false);
      toast.success("Imagem adicionada!");
    } catch {
      toast.error("URL inválida");
    }
  };

  const removeMainImage = () => {
    if (additionalImages.length > 0) {
      // Promote first additional to main
      onMainImageChange(additionalImages[0]);
      onAdditionalImagesChange(additionalImages.slice(1));
    } else {
      onMainImageChange("");
    }
  };

  const removeAdditionalImage = (index: number) => {
    onAdditionalImagesChange(additionalImages.filter((_, i) => i !== index));
  };

  const setAsMain = (url: string, index: number) => {
    if (mainImage) {
      // Move current main to additional
      const newAdditional = [...additionalImages];
      newAdditional[index] = mainImage;
      onAdditionalImagesChange(newAdditional);
    } else {
      removeAdditionalImage(index);
    }
    onMainImageChange(url);
    toast.success("Imagem definida como principal");
  };

  const allImages = [
    ...(mainImage ? [{ url: mainImage, isMain: true }] : []),
    ...additionalImages.map((url) => ({ url, isMain: false })),
  ];

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Fotos do Produto
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowUrlInput(!showUrlInput)}
              disabled={disabled}
            >
              <Link2 className="h-4 w-4 mr-1" />
              URL
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => multiFileInputRef.current?.click()}
              disabled={disabled || isUploading}
            >
              <Upload className="h-4 w-4 mr-1" />
              Enviar
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Até 50 fotos • Qualidade original mantida • Arraste para reordenar
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL Input */}
        {showUrlInput && (
          <div className="flex gap-2">
            <Input
              placeholder="Cole a URL da imagem..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addImageFromUrl()}
            />
            <Button size="sm" onClick={addImageFromUrl}>
              Adicionar
            </Button>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Enviando imagens... {uploadProgress}%</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleMainImageUpload}
        />
        <input
          ref={multiFileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleMultipleUpload}
        />

        {/* Images Grid */}
        {allImages.length === 0 ? (
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium">Clique para enviar a imagem principal</p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG, WebP • Máximo 10MB
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {allImages.map((image, index) => (
              <div
                key={`${image.url}-${index}`}
                className={`relative group aspect-square rounded-lg overflow-hidden border-2 ${
                  image.isMain ? "border-primary ring-2 ring-primary/20" : "border-muted"
                }`}
              >
                <img
                  src={image.url}
                  alt={`Imagem ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!image.isMain && (
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7"
                      onClick={() => setAsMain(image.url, index - 1)}
                      title="Definir como principal"
                    >
                      <Star className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-7 w-7"
                    onClick={() =>
                      image.isMain ? removeMainImage() : removeAdditionalImage(index - 1)
                    }
                    title="Remover"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Main badge */}
                {image.isMain && (
                  <div className="absolute top-1 left-1">
                    <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      Principal
                    </span>
                  </div>
                )}

                {/* Drag handle */}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-4 w-4 text-white cursor-grab" />
                </div>
              </div>
            ))}

            {/* Add more button */}
            {allImages.length < 51 && (
              <div
                className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => multiFileInputRef.current?.click()}
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">Adicionar</span>
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        {allImages.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {allImages.length} foto(s) • {50 - allImages.length + 1} disponíveis
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default InlinePhotosUploader;
