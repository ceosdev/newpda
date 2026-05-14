import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSetAttendance } from '@/features/matches/api/use-set-attendance';
import {
  ATTENDANCE_CHIP_CLASS,
  ATTENDANCE_LABELS,
  type AttendanceResponse,
} from '@/features/matches/lib/labels';
import { mapSupabaseError } from '@/lib/supabase/errors';
import { cn } from '@/lib/utils';

type AttendanceControlsProps = {
  matchId: string;
  currentResponse: AttendanceResponse | null;
  disabled?: boolean;
};

function ResponseButton({
  label,
  selected,
  onClick,
  disabled,
  selectedClass,
  outlineClass,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  selectedClass: string;
  outlineClass: string;
}) {
  return (
    <Button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={cn(selected ? selectedClass : outlineClass)}
    >
      {label}
    </Button>
  );
}

export function AttendanceControls({
  matchId,
  currentResponse,
  disabled,
}: AttendanceControlsProps) {
  const setAttendance = useSetAttendance();
  const busy = setAttendance.isPending;

  const dispatch = (next: AttendanceResponse) => {
    if (currentResponse === next) return;
    setAttendance.mutate(
      { matchId, response: next, previousResponse: currentResponse },
      {
        onError: (error) => toast.error(mapSupabaseError(error)),
      },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {currentResponse ? (
        <span
          className={cn(
            'inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
            ATTENDANCE_CHIP_CLASS[currentResponse],
          )}
        >
          Sua resposta: {ATTENDANCE_LABELS[currentResponse]}
        </span>
      ) : null}

      <div className="grid grid-cols-3 gap-2" onClick={(e) => e.stopPropagation()}>
        <ResponseButton
          label="Eu vou"
          selected={currentResponse === 'going'}
          onClick={() => dispatch('going')}
          disabled={disabled || busy}
          selectedClass="bg-emerald-600 text-white hover:bg-emerald-700"
          outlineClass="border border-emerald-600/40 bg-transparent text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
        />
        <ResponseButton
          label="Não vou"
          selected={currentResponse === 'declined'}
          onClick={() => dispatch('declined')}
          disabled={disabled || busy}
          selectedClass="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          outlineClass="border border-destructive/40 bg-transparent text-destructive hover:bg-destructive/10"
        />
        <ResponseButton
          label="Talvez"
          selected={currentResponse === 'maybe'}
          onClick={() => dispatch('maybe')}
          disabled={disabled || busy}
          selectedClass="bg-blue-600 text-white hover:bg-blue-700"
          outlineClass="border border-blue-600/40 bg-transparent text-blue-700 hover:bg-blue-500/10 dark:text-blue-400"
        />
      </div>
    </div>
  );
}
