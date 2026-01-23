import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Move, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface ImagePositionEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  positionX: number;
  positionY: number;
  scale: number;
  onSave: (posX: number, posY: number, scale: number) => void;
}

const ImagePositionEditor = ({
  isOpen,
  onClose,
  imageUrl,
  positionX,
  positionY,
  scale,
  onSave,
}: ImagePositionEditorProps) => {
  const [localPosX, setLocalPosX] = useState(positionX);
  const [localPosY, setLocalPosY] = useState(positionY);
  const [localScale, setLocalScale] = useState(scale);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalPosX(positionX);
    setLocalPosY(positionY);
    setLocalScale(scale);
  }, [positionX, positionY, scale, isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Calculate movement as percentage of container
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

    // Invert the movement so dragging feels natural (drag image, not viewport)
    const newPosX = Math.max(0, Math.min(100, localPosX - deltaX));
    const newPosY = Math.max(0, Math.min(100, localPosY - deltaY));

    setLocalPosX(newPosX);
    setLocalPosY(newPosY);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setLocalScale(Math.min(200, localScale + 10));
  };

  const handleZoomOut = () => {
    setLocalScale(Math.max(50, localScale - 10));
  };

  const handleReset = () => {
    setLocalPosX(50);
    setLocalPosY(50);
    setLocalScale(100);
  };

  const handleSave = () => {
    onSave(Math.round(localPosX), Math.round(localPosY), localScale);
    onClose();
  };

  if (!imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="h-5 w-5" />
            Posicionar Imagem de Fundo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Arraste a imagem para enquadrá-la. Use os botões de zoom para ajustar o tamanho.
          </p>

          {/* Preview container - simulates the hero aspect ratio */}
          <div
            ref={containerRef}
            className="relative w-full h-[400px] overflow-hidden rounded-lg border-2 border-dashed border-primary/50 cursor-move bg-muted"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <div
              className="absolute inset-0 transition-none"
              style={{
                backgroundImage: `url(${imageUrl})`,
                backgroundPosition: `${localPosX}% ${localPosY}%`,
                backgroundSize: `${localScale}%`,
                backgroundRepeat: "no-repeat",
              }}
            />
            
            {/* Overlay to show it's editable */}
            <div className="absolute inset-0 bg-black/10 pointer-events-none" />
            
            {/* Center crosshair guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-8 border-2 border-white/50 rounded-full" />
              <div className="absolute w-px h-full bg-white/20" />
              <div className="absolute w-full h-px bg-white/20" />
            </div>

            {/* Drag indicator */}
            {isDragging && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs">
                Arrastando...
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm min-w-[60px] text-center">{localScale}%</span>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>X: {Math.round(localPosX)}%</span>
              <span>Y: {Math.round(localPosY)}%</span>
            </div>

            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Resetar
            </Button>
          </div>

          {/* Slider controls for fine-tuning */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Posição Horizontal</Label>
              <input
                type="range"
                min="0"
                max="100"
                value={localPosX}
                onChange={(e) => setLocalPosX(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <Label className="text-xs">Posição Vertical</Label>
              <input
                type="range"
                min="0"
                max="100"
                value={localPosY}
                onChange={(e) => setLocalPosY(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Aplicar Posição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImagePositionEditor;
