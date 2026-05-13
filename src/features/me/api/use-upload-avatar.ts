import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

const BUCKET = 'avatars';
const MAX_BYTES = 1_048_576; // 1 MiB
const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export const AVATAR_ACCEPT = ALLOWED_MIMES.join(',');

function pathFor(userId: string) {
  return `${userId}/avatar`;
}

export function avatarPublicUrl(userId: string, cacheBuster?: number): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(pathFor(userId));
  if (!cacheBuster) return data.publicUrl;
  return `${data.publicUrl}?v=${cacheBuster}`;
}

export function useUploadAvatar(userId: string | null) {
  return useMutation({
    mutationFn: async (file: File) => {
      if (!userId) throw new Error('Sessão inválida.');
      if (file.size > MAX_BYTES) {
        throw new Error('Arquivo maior que 1 MB. Use uma imagem menor.');
      }
      if (!ALLOWED_MIMES.includes(file.type as (typeof ALLOWED_MIMES)[number])) {
        throw new Error('Formato inválido. Use PNG, JPEG ou WEBP.');
      }

      const { error } = await supabase.storage.from(BUCKET).upload(pathFor(userId), file, {
        upsert: true,
        contentType: file.type,
        cacheControl: '3600',
      });
      if (error) throw error;
      return avatarPublicUrl(userId, Date.now());
    },
  });
}

export function useRemoveAvatar(userId: string | null) {
  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Sessão inválida.');
      const { error } = await supabase.storage.from(BUCKET).remove([pathFor(userId)]);
      if (error) throw error;
    },
  });
}
