import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AvatarCropDialog } from '@/features/me/components/avatar-crop-dialog';
import {
  AVATAR_ACCEPT,
  avatarPublicUrl,
  useRemoveAvatar,
  useUploadAvatar,
} from '@/features/me/api/use-upload-avatar';
import { mapSupabaseError } from '@/lib/supabase/errors';
import { cn } from '@/lib/utils';

type AvatarUploaderProps = {
  userId: string;
  displayName: string;
  currentAvatarUrl: string | null;
  onAvatarChange: (publicUrl: string | null) => void;
};

const MAX_BYTES = 1_048_576;
const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp'];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  const first = parts[0] ?? '';
  const last = parts[parts.length - 1] ?? '';
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function AvatarUploader({
  userId,
  displayName,
  currentAvatarUrl,
  onAvatarChange,
}: AvatarUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewVersion, setPreviewVersion] = useState<number | null>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const upload = useUploadAvatar(userId);
  const remove = useRemoveAvatar(userId);

  const isBusy = upload.isPending || remove.isPending;
  const displayUrl = previewVersion
    ? avatarPublicUrl(userId, previewVersion)
    : currentAvatarUrl;

  const handlePick = () => fileInputRef.current?.click();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_BYTES) {
      toast.error('Arquivo maior que 1 MB. Use uma imagem menor.');
      return;
    }
    if (!ALLOWED_MIMES.includes(file.type)) {
      toast.error('Formato inválido. Use PNG, JPEG ou WEBP.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setSourceImage(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => toast.error('Não foi possível ler o arquivo.');
    reader.readAsDataURL(file);
  };

  const handleConfirmCrop = async (blob: Blob) => {
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
    try {
      const publicUrl = await upload.mutateAsync(file);
      const cleanUrl = publicUrl.split('?')[0] ?? publicUrl;
      onAvatarChange(cleanUrl);
      setPreviewVersion(Date.now());
      setSourceImage(null);
      toast.success('Foto atualizada.');
    } catch (error) {
      toast.error(mapSupabaseError(error));
    }
  };

  const handleRemove = () => {
    remove.mutate(undefined, {
      onSuccess: () => {
        onAvatarChange(null);
        setPreviewVersion(null);
        toast.success('Foto removida.');
      },
      onError: (error) => toast.error(mapSupabaseError(error)),
    });
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          'flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-lg font-medium text-primary',
          isBusy && 'opacity-60',
        )}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={displayName}
            className="size-full object-cover"
            draggable={false}
          />
        ) : (
          <span aria-hidden>{initialsOf(displayName)}</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={AVATAR_ACCEPT}
          className="hidden"
          onChange={handleFile}
          aria-hidden
          tabIndex={-1}
        />
        <Button type="button" variant="outline" size="sm" onClick={handlePick} disabled={isBusy}>
          <Camera className="size-4" />
          Trocar foto
        </Button>
        {currentAvatarUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={isBusy}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" />
            Remover
          </Button>
        ) : null}
      </div>

      <AvatarCropDialog
        open={Boolean(sourceImage)}
        imageSrc={sourceImage}
        onCancel={() => setSourceImage(null)}
        onConfirm={handleConfirmCrop}
        isUploading={upload.isPending}
      />
    </div>
  );
}
