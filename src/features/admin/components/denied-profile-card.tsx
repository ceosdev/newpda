import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApproveSheet } from '@/features/admin/components/approve-sheet';
import { useRevokeApproval } from '@/features/admin/api/use-revoke-approval';
import type { DeniedProfile } from '@/features/admin/api/use-denied-profiles';
import { mapSupabaseError } from '@/lib/supabase/errors';

type DeniedProfileCardProps = {
  profile: DeniedProfile;
};

export function DeniedProfileCard({ profile }: DeniedProfileCardProps) {
  const [openApprove, setOpenApprove] = useState(false);
  const revoke = useRevokeApproval();

  const handleRevoke = () => {
    revoke.mutate(
      { targetId: profile.id },
      {
        onSuccess: () => toast.success(`${profile.display_name} voltou para pendente.`),
        onError: (error) => toast.error(mapSupabaseError(error)),
      },
    );
  };

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-0.5">
            <p className="truncate text-sm font-medium">{profile.display_name}</p>
            <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
          </div>

          {profile.denied_reason ? (
            <div className="rounded-md bg-muted px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Motivo</p>
              <p className="line-clamp-3 text-xs">{profile.denied_reason}</p>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleRevoke}
              disabled={revoke.isPending}
            >
              {revoke.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Voltando...
                </>
              ) : (
                'Voltar a pendente'
              )}
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => setOpenApprove(true)}
              disabled={revoke.isPending}
            >
              Aprovar
            </Button>
          </div>
        </CardContent>
      </Card>

      <ApproveSheet
        profile={{
          id: profile.id,
          email: profile.email,
          display_name: profile.display_name,
          created_at: profile.updated_at,
        }}
        open={openApprove}
        onOpenChange={setOpenApprove}
      />
    </>
  );
}
