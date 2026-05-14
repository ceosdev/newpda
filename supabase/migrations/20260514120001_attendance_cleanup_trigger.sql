-- When a player leaves the active roster, their previous attendance answers
-- are dropped (decision recorded in Spec 002 §6). Transitions active↔injured
-- keep the answers; only going inactive or being archived wipes them.

create or replace function public.app_attendance_cleanup_on_player_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_left_active_roster boolean :=
    (OLD.player_status in ('active','injured') and NEW.player_status = 'inactive')
    or (OLD.archived_at is null and NEW.archived_at is not null);
begin
  if v_left_active_roster then
    delete from public.match_attendances
    where profile_id = NEW.profile_id;
  end if;
  return NEW;
end;
$$;

revoke execute on function public.app_attendance_cleanup_on_player_change() from public, anon;

create trigger players_attendance_cleanup
  after update on public.players
  for each row
  when (
    OLD.player_status is distinct from NEW.player_status
    or OLD.archived_at is distinct from NEW.archived_at
  )
  execute function public.app_attendance_cleanup_on_player_change();
