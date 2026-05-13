import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApproveSheet } from '@/features/admin/components/approve-sheet';
import { DenySheet } from '@/features/admin/components/deny-sheet';
import type { PendingProfile } from '@/features/admin/api/use-pending-profiles';

type PendingProfileCardProps = {
  profile: PendingProfile;
};

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'agora há pouco';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} mês${months > 1 ? 'es' : ''}`;
  const years = Math.floor(months / 12);
  return `há ${years} ano${years > 1 ? 's' : ''}`;
}

export function PendingProfileCard({ profile }: PendingProfileCardProps) {
  const [openSheet, setOpenSheet] = useState<'approve' | 'deny' | null>(null);

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-0.5">
            <p className="truncate text-sm font-medium">{profile.display_name}</p>
            <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {formatRelative(profile.created_at)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => setOpenSheet('approve')}
            >
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => setOpenSheet('deny')}
            >
              Negar
            </Button>
          </div>
        </CardContent>
      </Card>

      <ApproveSheet
        profile={profile}
        open={openSheet === 'approve'}
        onOpenChange={(open) => setOpenSheet(open ? 'approve' : null)}
      />
      <DenySheet
        profile={profile}
        open={openSheet === 'deny'}
        onOpenChange={(open) => setOpenSheet(open ? 'deny' : null)}
      />
    </>
  );
}
