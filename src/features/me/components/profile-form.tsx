import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AvatarUploader } from '@/features/me/components/avatar-uploader';
import { useUpdateMyProfile } from '@/features/me/api/use-update-my-profile';
import { useUpdateMyPlayer } from '@/features/me/api/use-update-my-player';
import {
  POSITION_LABELS,
  PREFERRED_POSITIONS,
  profileEditSchema,
  type PreferredPosition,
  type ProfileEditInput,
} from '@/features/me/schemas/profile-edit.schema';
import type { CurrentPlayer } from '@/features/me/api/use-current-player';
import type { Profile } from '@/features/auth/types';
import { mapSupabaseError } from '@/lib/supabase/errors';

type ProfileFormProps = {
  profile: Profile;
  player: CurrentPlayer | null;
};

const NO_POSITION = '__none__';
const PROFILE_FIELDS = ['displayName', 'birthDate', 'phone'] as const;
const PLAYER_FIELDS = ['nickname', 'preferredPosition'] as const;

export function ProfileForm({ profile, player }: ProfileFormProps) {
  const updateProfile = useUpdateMyProfile();
  const updatePlayer = useUpdateMyPlayer();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);

  const isPlayer = profile.role === 'player' && player !== null;

  const form = useForm<ProfileEditInput>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      displayName: profile.display_name,
      phone: profile.phone ?? '',
      birthDate: profile.birth_date ?? '',
      nickname: player?.nickname ?? '',
      preferredPosition: (player?.preferred_position as PreferredPosition | null) ?? null,
    },
  });

  const handleAvatarChange = (publicUrl: string | null) => {
    setAvatarUrl(publicUrl);
    updateProfile.mutate(
      {
        displayName: form.getValues('displayName'),
        avatarUrl: publicUrl,
        phone: form.getValues('phone')?.trim() ? form.getValues('phone')?.trim() : null,
        birthDate: form.getValues('birthDate') || null,
      },
      {
        onError: (error) => toast.error(mapSupabaseError(error)),
      },
    );
  };

  const onSubmit = async (values: ProfileEditInput) => {
    setSubmitError(null);
    const dirty = form.formState.dirtyFields;
    const profileDirty = PROFILE_FIELDS.some((field) => dirty[field]);
    const playerDirty = isPlayer && PLAYER_FIELDS.some((field) => dirty[field]);

    if (!profileDirty && !playerDirty) return;

    const tasks: Promise<unknown>[] = [];
    const phone = values.phone?.trim() ? values.phone.trim() : null;
    const birthDate = values.birthDate ? values.birthDate : null;
    const nickname = values.nickname?.trim() ? values.nickname.trim() : null;

    if (profileDirty) {
      tasks.push(
        updateProfile.mutateAsync({
          displayName: values.displayName,
          avatarUrl,
          phone,
          birthDate,
        }),
      );
    }
    if (playerDirty) {
      tasks.push(
        updatePlayer.mutateAsync({
          nickname,
          preferredPosition: values.preferredPosition,
        }),
      );
    }

    const results = await Promise.allSettled(tasks);
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

    if (failed.length === 0) {
      toast.success('Cadastro salvo.');
      form.reset({
        displayName: values.displayName,
        birthDate: birthDate ?? '',
        phone: phone ?? '',
        nickname: nickname ?? '',
        preferredPosition: values.preferredPosition,
      });
      return;
    }

    const messages = failed.map((r) => mapSupabaseError(r.reason));
    setSubmitError(messages.join(' '));

    if (failed.length < results.length) {
      toast.warning('Parte do cadastro foi salva, mas houve falhas.');
    }
  };

  const isSaving = updateProfile.isPending || updatePlayer.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Meu cadastro</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <AvatarUploader
          userId={profile.id}
          displayName={profile.display_name}
          currentAvatarUrl={avatarUrl}
          onAvatarChange={handleAvatarChange}
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" placeholder="Como te chamam" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de nascimento</FormLabel>
                  <FormControl>
                    <Input type="date" autoComplete="bday" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Celular (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="(11) 91234-5678"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isPlayer ? (
              <>
                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apelido em campo (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Como te chamam em campo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferredPosition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Posição preferida</FormLabel>
                      <Select
                        value={field.value ?? NO_POSITION}
                        onValueChange={(value) =>
                          field.onChange(
                            value === NO_POSITION ? null : (value as PreferredPosition),
                          )
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sem preferência" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_POSITION}>Sem preferência</SelectItem>
                          {PREFERRED_POSITIONS.map((pos) => (
                            <SelectItem key={pos} value={pos}>
                              {POSITION_LABELS[pos]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : null}

            {submitError ? (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              disabled={isSaving || !form.formState.isDirty}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
