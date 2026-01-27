import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload, Image, Video, FileText, Check, Monitor, Smartphone, Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProcessedOutput {
  platform: string;
  platformKey: string;
  dimensions: { width: number; height: number };
  aspectRatio: string;
  recommendations: string[];
}

interface FileAnalysis {
  detected_content?: string;
  main_subject_position?: string;
  has_text?: boolean;
  text_content?: string;
  dominant_colors?: string[];
  quality_score?: number;
  crop_suggestions?: {
    safe_zone?: { x: number; y: number; width: number; height: number };
    focus_point?: { x: number; y: number };
  };
}

interface ProcessResult {
  originalFile: {
    name: string;
    type: string;
    category: string;
  };
  analysis: FileAnalysis | null;
  outputs: ProcessedOutput[];
  processingTips: string[];
}

interface FileProcessorProps {
  onFileProcessed?: (result: ProcessResult) => void;
}

const PLATFORMS = [
  { key: "instagram_feed", label: "Instagram Feed", icon: <Smartphone className="h-4 w-4" /> },
  { key: "instagram_stories", label: "Stories/Reels", icon: <Smartphone className="h-4 w-4" /> },
  { key: "facebook_feed", label: "Facebook Feed", icon: <Monitor className="h-4 w-4" /> },
  { key: "facebook_ads", label: "Facebook Ads", icon: <Monitor className="h-4 w-4" /> },
  { key: "google_ads_display", label: "Google Display", icon: <Globe className="h-4 w-4" /> },
  { key: "google_ads_square", label: "Google Quadrado", icon: <Globe className="h-4 w-4" /> },
  { key: "marketplace", label: "Marketplace", icon: <Globe className="h-4 w-4" /> },
  { key: "whatsapp_status", label: "WhatsApp Status", icon: <Smartphone className="h-4 w-4" /> },
];

const FileProcessor = ({ onFileProcessed }: FileProcessorProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram_feed", "instagram_stories"]);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não suportado. Use: JPG, PNG, WEBP, MP4, MOV ou PDF");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Arquivo deve ter no máximo 50MB");
      return;
    }

    setSelectedFile(file);
    setResult(null);

    // Show preview
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) {
      toast.error("Selecione um arquivo primeiro");
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error("Selecione pelo menos uma plataforma");
      return;
    }

    setIsProcessing(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(selectedFile);
      });

      const { data, error } = await supabase.functions.invoke("ai-file-processor", {
        body: {
          fileBase64: base64,
          fileType: selectedFile.type,
          fileName: selectedFile.name,
          targetPlatforms: selectedPlatforms,
        },
      });

      if (error) throw error;

      setResult(data);
      onFileProcessed?.(data);
      toast.success("Arquivo processado com sucesso!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao processar arquivo");
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="h-12 w-12" />;
    if (selectedFile.type.startsWith("image/")) return <Image className="h-12 w-12 text-blue-500" />;
    if (selectedFile.type.startsWith("video/")) return <Video className="h-12 w-12 text-purple-500" />;
    return <FileText className="h-12 w-12 text-orange-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Processador de Arquivos para Anúncios
        </CardTitle>
        <CardDescription>
          Envie qualquer arquivo (imagem, vídeo, PDF) e receba adaptações automáticas para cada plataforma
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload */}
        <div 
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,application/pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
          
          {previewUrl && selectedFile?.type.startsWith("image/") ? (
            <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded mb-4" />
          ) : previewUrl && selectedFile?.type.startsWith("video/") ? (
            <video src={previewUrl} controls className="max-h-48 mx-auto rounded mb-4" />
          ) : (
            <div className="flex flex-col items-center">
              {getFileIcon()}
              <p className="mt-4 text-sm text-muted-foreground">
                Clique para enviar arquivo
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WEBP, MP4, MOV, PDF (até 50MB)
              </p>
            </div>
          )}
          
          {selectedFile && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Badge variant="secondary">{selectedFile.name}</Badge>
              <Badge variant="outline">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</Badge>
            </div>
          )}
        </div>

        {/* Platform Selection */}
        <div className="space-y-3">
          <Label>Plataformas de Destino</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PLATFORMS.map(platform => (
              <div
                key={platform.key}
                className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                  selectedPlatforms.includes(platform.key)
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-secondary"
                }`}
                onClick={() => togglePlatform(platform.key)}
              >
                <Checkbox
                  checked={selectedPlatforms.includes(platform.key)}
                  onCheckedChange={() => togglePlatform(platform.key)}
                />
                {platform.icon}
                <span className="text-xs">{platform.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Process Button */}
        <Button 
          onClick={handleProcess} 
          disabled={!selectedFile || isProcessing || selectedPlatforms.length === 0}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Processar Arquivo
        </Button>

        {/* Results */}
        {result && (
          <div className="space-y-4 mt-6">
            <h4 className="font-semibold">Resultado da Análise</h4>

            {/* AI Analysis */}
            {result.analysis && (
              <Card className="bg-secondary/30">
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Conteúdo Detectado</p>
                      <p className="font-medium">{result.analysis.detected_content}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Qualidade</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${(result.analysis.quality_score || 0) * 10}%` }}
                          />
                        </div>
                        <span className="font-medium">{result.analysis.quality_score}/10</span>
                      </div>
                    </div>
                  </div>
                  
                  {result.analysis.has_text && (
                    <div>
                      <p className="text-muted-foreground text-xs">Texto Detectado</p>
                      <p className="text-sm">{result.analysis.text_content}</p>
                    </div>
                  )}

                  {result.analysis.dominant_colors && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Cores Dominantes</p>
                      <div className="flex gap-2">
                        {result.analysis.dominant_colors.map((color, i) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded-full border shadow-sm"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Platform Outputs */}
            <ScrollArea className="h-64">
              <div className="space-y-3 pr-4">
                {result.outputs.map((output, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">{output.platform}</h5>
                        <Badge variant="outline">{output.aspectRatio}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Dimensões: {output.dimensions.width} x {output.dimensions.height}px
                      </p>
                      <ul className="text-xs space-y-1">
                        {output.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {/* Processing Tips */}
            {result.processingTips.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Dicas de Processamento
                </p>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  {result.processingTips.map((tip, i) => (
                    <li key={i}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileProcessor;
