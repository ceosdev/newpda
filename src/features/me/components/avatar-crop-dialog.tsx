import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

type AvatarCropDialogProps = {
  open: boolean;
  imageSrc: string | null;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
  isUploading: boolean;
};

const OUTPUT_SIZE = 512;

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem.'));
    img.src = src;
  });
}

async function cropToBlob(imageSrc: string, area: Area): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível.');

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Falha ao gerar a imagem.'));
        resolve(blob);
      },
      'image/jpeg',
      0.9,
    );
  });
}

export function AvatarCropDialog({
  open,
  imageSrc,
  onCancel,
  onConfirm,
  isUploading,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedArea(null);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  const handleApply = async () => {
    if (!imageSrc || !croppedArea) return;
    setError(null);
    setSubmitting(true);
    try {
      const blob = await cropToBlob(imageSrc, croppedArea);
      await onConfirm(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao processar a imagem.');
      setSubmitting(false);
    }
  };

  const busy = submitting || isUploading;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-left">
          <DialogTitle>Ajustar foto</DialogTitle>
          <DialogDescription>
            Arraste para reposicionar e use o slider para dar zoom.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-64 w-full overflow-hidden rounded-md bg-muted">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Zoom</Label>
          <Slider
            value={[zoom]}
            min={1}
            max={4}
            step={0.05}
            onValueChange={(value) => setZoom(value[0] ?? 1)}
            disabled={busy}
          />
        </div>

        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleApply} disabled={busy || !croppedArea} className="w-full">
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isUploading ? 'Enviando...' : 'Processando...'}
              </>
            ) : (
              'Aplicar'
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={busy}
            className="w-full"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
