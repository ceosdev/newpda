import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDenyUser } from '@/features/admin/api/use-deny-user';
import { denySchema, type DenyInput } from '@/features/admin/schemas/deny.schema';
import type { PendingProfile } from '@/features/admin/api/use-pending-profiles';
import { mapSupabaseError } from '@/lib/supabase/errors';

type DenySheetProps = {
  profile: PendingProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DenySheet({ profile, open, onOpenChange }: DenySheetProps) {
  const deny = useDenyUser();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<DenyInput>({
    resolver: zodResolver(denySchema),
    defaultValues: { reason: '' },
  });

  const handleClose = (next: boolean) => {
    if (!next) {
      form.reset({ reason: '' });
      setSubmitError(null);
    }
    onOpenChange(next);
  };

  const onSubmit = (values: DenyInput) => {
    setSubmitError(null);
    deny.mutate(
      { targetId: profile.id, reason: values.reason },
      {
        onSuccess: () => {
          toast.success(`${profile.display_name} negado(a).`);
          handleClose(false);
        },
        onError: (error) => setSubmitError(mapSupabaseError(error)),
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="flex flex-col gap-4">
        <SheetHeader className="text-left">
          <SheetTitle>Negar {profile.display_name}</SheetTitle>
          <SheetDescription>
            Descreva o motivo. Ele fica registrado no histórico e é visível para o usuário.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex.: não conheço, conta duplicada, etc."
                      rows={4}
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError ? (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}

            <SheetFooter className="flex-col gap-2 px-0">
              <Button
                type="submit"
                variant="destructive"
                disabled={deny.isPending}
                className="w-full"
              >
                {deny.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Negando...
                  </>
                ) : (
                  'Confirmar negação'
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleClose(false)}
                disabled={deny.isPending}
                className="w-full"
              >
                Cancelar
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
