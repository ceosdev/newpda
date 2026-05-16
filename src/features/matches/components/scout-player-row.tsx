import { Controller, type Control } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { PlayerMiniCard } from '@/features/matches/components/player-mini-card';
import { positionLabel } from '@/features/team/lib/labels';
import type { RecordScoutsInput } from '@/features/matches/schemas/match-scouts.schema';
import { cn } from '@/lib/utils';

type ScoutField = 'goals' | 'yellowCards' | 'blueCards' | 'redCards' | 'wins' | 'draws';

const FIELDS: { name: ScoutField; label: string }[] = [
  { name: 'goals', label: 'Gols' },
  { name: 'yellowCards', label: 'Amarelos' },
  { name: 'blueCards', label: 'Azuis' },
  { name: 'redCards', label: 'Vermelhos' },
  { name: 'wins', label: 'Vitórias' },
  { name: 'draws', label: 'Empates' },
];

type ScoutPlayerRowProps = {
  control: Control<RecordScoutsInput>;
  index: number;
  primaryName: string;
  avatarUrl: string | null;
  preferredPosition: string | null;
  /** hidden by the in-memory search (kept mounted to preserve typed values) */
  hidden?: boolean;
};

/**
 * One player's scout form inside the launch modal: identity header plus the six
 * integer counters. Inputs accept digits only and are capped at two digits.
 */
export function ScoutPlayerRow({
  control,
  index,
  primaryName,
  avatarUrl,
  preferredPosition,
  hidden = false,
}: ScoutPlayerRowProps) {
  return (
    <div className={cn('flex flex-col gap-2 rounded-xl border bg-card p-2.5', hidden && 'hidden')}>
      <PlayerMiniCard
        avatarUrl={avatarUrl}
        primaryName={primaryName}
        secondary={positionLabel(preferredPosition)}
        className="border-0 bg-transparent p-0 shadow-none"
      />
      <div className="grid grid-cols-3 gap-2">
        {FIELDS.map((field) => (
          <Controller
            key={field.name}
            control={control}
            name={`entries.${index}.${field.name}`}
            render={({ field: f }) => (
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {field.label}
                </span>
                <Input
                  inputMode="numeric"
                  value={String(f.value)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
                    f.onChange(digits === '' ? 0 : Number(digits));
                  }}
                  onFocus={(e) => e.target.select()}
                  onBlur={f.onBlur}
                  aria-label={`${field.label} de ${primaryName}`}
                  className="h-9 text-center tabular-nums"
                />
              </label>
            )}
          />
        ))}
      </div>
    </div>
  );
}
